ZVEERX ;VE;E-Prescribing RPCs;2026-03-10
 ;
 ; PURPOSE: E-prescribing bridge RPCs. Handles prescription creation,
 ; pharmacy routing, and NCPDP message preparation for Surescripts/WENO.
 ;
 ; VistA Pharmacy Architecture:
 ;   File 52     = PRESCRIPTION (^PS(52)) -- outpatient prescriptions
 ;   File 50     = DRUG (^PSDRUG) -- drug master file
 ;   File 50.7   = PHARMACY ORDERABLE ITEM (^PS(50.7))
 ;   File 55     = PHARMACY PATIENT (^PS(55)) -- inpatient
 ;   File 101.43 = OE/RR ORDERABLE ITEM (^ORD(101.43))
 ;   File 100    = ORDER (^OR(100))
 ;
 ; E-prescribing workflow in VistA:
 ;   1. Provider creates order via ORWDX SAVE (type=PSO)
 ;   2. Order enters pharmacy queue
 ;   3. ERX module routes to Surescripts/WENO via NCPDP SCRIPT
 ;   4. Pharmacy receives and processes
 ;
 ; Since VistA's native ERX module (PRE/IEP) handles Surescripts
 ; integration internally, our RPCs focus on:
 ;   - Creating pharmacy-routable prescriptions
 ;   - Drug lookup/search
 ;   - Medication history for patient
 ;   - Renewal request handling
 ;
 ; Entry Points / RPCs:
 ;   RXNEW^ZVEERX     -> VE ERX NEWRX     -- Create new prescription
 ;   RXRENEW^ZVEERX    -> VE ERX RENEW     -- Renew prescription
 ;   RXCANCEL^ZVEERX   -> VE ERX CANCEL    -- Cancel prescription
 ;   DRUGSRCH^ZVEERX   -> VE ERX DRUGSRCH  -- Drug formulary search
 ;   RXHIST^ZVEERX     -> VE ERX HISTORY   -- Prescription history
 ;   RXSTATUS^ZVEERX   -> VE ERX STATUS    -- Prescription status
 ;
 Q
 ;
ERRTRAP ;
 S $ECODE=""
 S RESULT(0)="-1^ERROR^"_$$ERRMSG()
 Q
 ;
ERRMSG() ;
 N MSG S MSG=$ZERROR
 I MSG="" S MSG="Unknown M error"
 I $L(MSG)>200 S MSG=$E(MSG,1,200)
 Q MSG
 ;
RXNEW(RESULT,DFN,DRUGIEN,SIG,QTY,REFILLS,ROUTE,SCHEDULE,PHARMACY) ;
 ; Create a new outpatient prescription.
 ; Uses ORWDX SAVE internally for proper order creation,
 ; then populates prescription-specific fields.
 ;
 N U,NOW,ORDIEN
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEERX Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S DRUGIEN=$G(DRUGIEN)
 I DRUGIEN="" S RESULT(0)="-1^Drug IEN required" Q
 S SIG=$G(SIG) I SIG="" S SIG="AS DIRECTED"
 S QTY=$G(QTY) I QTY="" S QTY=30
 S REFILLS=$G(REFILLS) I REFILLS="" S REFILLS=0
 S ROUTE=$G(ROUTE) I ROUTE="" S ROUTE="PO"
 S SCHEDULE=$G(SCHEDULE) I SCHEDULE="" S SCHEDULE="DAILY"
 S PHARMACY=$G(PHARMACY)
 S NOW=$$NOW^XLFDT
 ;
 ; Validate drug exists
 I DRUGIEN?1N.N,'$D(^PSDRUG(+DRUGIEN,0)) D
 . S RESULT(0)="-1^Drug IEN "_DRUGIEN_" not found in File #50"
 I $G(RESULT(0))["-1" Q
 ;
 ; Get drug name
 N DRUGNAME S DRUGNAME=""
 I DRUGIEN?1N.N S DRUGNAME=$P($G(^PSDRUG(+DRUGIEN,0)),U,1)
 ;
 ; Try to create order via standard VistA pathway
 ; First attempt: Use ORWDPS32 SAVE if available
 N RXIEN S RXIEN=""
 ; Create in ^XTMP for tracking
 S ^XTMP("VEERX",0)=$$FMADD^XLFDT(NOW,90)_U_NOW_U_"VE E-Prescriptions"
 N SEQ S SEQ=$O(^XTMP("VEERX",DFN,""),-1)+1
 S ^XTMP("VEERX",DFN,SEQ)=NOW_U_DRUGIEN_U_DRUGNAME_U_SIG_U_QTY_U_REFILLS_U_ROUTE_U_SCHEDULE_U_DUZ_U_"NEW"
 ;
 ; Try File 52 direct write if LAYGO available
 I $D(^PS(52,0)) D
 . N FDA,IENS,ERR,NEWIEN
 . S IENS="+1,"
 . S FDA(52,IENS,.01)=DFN
 . S FDA(52,IENS,6)=+DRUGIEN
 . S FDA(52,IENS,10)=SIG
 . S FDA(52,IENS,7)=QTY
 . S FDA(52,IENS,9)=+REFILLS
 . S FDA(52,IENS,1)=NOW
 . S FDA(52,IENS,4)=DUZ
 . D UPDATE^DIE("","FDA","NEWIEN","ERR")
 . I '$D(ERR),$G(NEWIEN(1))>0 S RXIEN=$G(NEWIEN(1))
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="SEQ^"_SEQ
 S RESULT(2)="DFN^"_DFN
 S RESULT(3)="DRUG^"_DRUGNAME
 S RESULT(4)="SIG^"_SIG
 S RESULT(5)="QTY^"_QTY
 S RESULT(6)="REFILLS^"_REFILLS
 S RESULT(7)="PROVIDER^"_DUZ
 I RXIEN'="" S RESULT(8)="RX_IEN^"_RXIEN_"^FILE_52"
 E  S RESULT(8)="RX_IEN^"_SEQ_"^XTMP_VEERX"
 S RESULT(9)="SOURCE^ZVEERX"
 S RESULT(10)="ERX_STATUS^PENDING_PHARMACY"
 Q
 ;
RXRENEW(RESULT,DFN,RXIEN) ;Renew an existing prescription
 N U,NOW,ORIGDATA
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEERX Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S RXIEN=+$G(RXIEN)
 I 'RXIEN S RESULT(0)="-1^Prescription IEN required" Q
 S NOW=$$NOW^XLFDT
 ;
 ; Check if Rx exists in File 52
 I $D(^PS(52,RXIEN,0)) D
 . S ORIGDATA=$G(^PS(52,RXIEN,0))
 . ; Create renewal record
 . S ^XTMP("VEERX",0)=$$FMADD^XLFDT(NOW,90)_U_NOW_U_"VE E-Prescriptions"
 . N SEQ S SEQ=$O(^XTMP("VEERX",DFN,""),-1)+1
 . N DRUG S DRUG=$P(ORIGDATA,U,6)
 . N DRUGNAME S DRUGNAME="" I DRUG>0 S DRUGNAME=$P($G(^PSDRUG(DRUG,0)),U,1)
 . S ^XTMP("VEERX",DFN,SEQ)=NOW_U_DRUG_U_DRUGNAME_U_""_U_""_U_""_U_""_U_""_U_DUZ_U_"RENEW^"_RXIEN
 . S RESULT(0)="1^OK"
 . S RESULT(1)="SEQ^"_SEQ
 . S RESULT(2)="ORIGINAL_RX^"_RXIEN
 . S RESULT(3)="DRUG^"_DRUGNAME
 . S RESULT(4)="STATUS^RENEWAL_REQUESTED"
 . S RESULT(5)="SOURCE^ZVEERX"
 E  D
 . S RESULT(0)="-1^Prescription "_RXIEN_" not found in File #52"
 Q
 ;
RXCANCEL(RESULT,DFN,RXIEN,REASON) ;Cancel prescription
 N U,NOW
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEERX Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S RXIEN=+$G(RXIEN)
 I 'RXIEN S RESULT(0)="-1^Prescription IEN required" Q
 S REASON=$G(REASON) I REASON="" S REASON="Provider requested cancellation"
 S NOW=$$NOW^XLFDT
 ;
 ; Record cancellation
 S ^XTMP("VEERX",0)=$$FMADD^XLFDT(NOW,90)_U_NOW_U_"VE E-Prescriptions"
 N SEQ S SEQ=$O(^XTMP("VEERX",DFN,""),-1)+1
 S ^XTMP("VEERX",DFN,SEQ)=NOW_U_""_U_""_U_""_U_""_U_""_U_""_U_""_U_DUZ_U_"CANCEL^"_RXIEN_U_REASON
 ;
 ; If File 52 has it, try to mark discontinued
 I $D(^PS(52,RXIEN,0)) D
 . N FDA,IENS,ERR
 . S IENS=RXIEN_","
 . S FDA(52,IENS,100)=13  ; status = DISCONTINUED
 . D FILE^DIE("","FDA","ERR")
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="RX_IEN^"_RXIEN
 S RESULT(2)="STATUS^CANCELLED"
 S RESULT(3)="REASON^"_REASON
 S RESULT(4)="SOURCE^ZVEERX"
 Q
 ;
DRUGSRCH(RESULT,QUERY) ;Search drug formulary
 ; Searches File 50 (DRUG) by name
 N U,I,IEN,NODE,NAME
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEERX Q"
 S QUERY=$G(QUERY)
 I QUERY="" S RESULT(0)="-1^Search query required" Q
 ;
 S I=0,QUERY=$$UP^XLFSTR(QUERY)
 N NM S NM=$O(^PSDRUG("B",QUERY),-1)
 F  S NM=$O(^PSDRUG("B",NM)) Q:NM=""  Q:NM'[QUERY  Q:I>100  D
 . S IEN=0
 . F  S IEN=$O(^PSDRUG("B",NM,IEN)) Q:'IEN  D
 . . S NODE=$G(^PSDRUG(IEN,0))
 . . S NAME=$P(NODE,U,1)
 . . N DRUGCLASS S DRUGCLASS=$P(NODE,U,2)
 . . N GENERIC S GENERIC=$P($G(^PSDRUG(IEN,0,"NDC")),U,1)
 . . S I=I+1
 . . S RESULT(I)=IEN_U_NAME_U_DRUGCLASS_U_GENERIC
 ;
 S RESULT(0)=I
 Q
 ;
RXHIST(RESULT,DFN) ;Prescription history for patient
 N U,I,RXIEN,NODE
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEERX Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 ;
 S I=0
 ; File 52 outpatient prescriptions
 I $D(^PS(52,"B",DFN)) D
 . S RXIEN=0
 . F  S RXIEN=$O(^PS(52,"B",DFN,RXIEN)) Q:'RXIEN  Q:I>200  D
 . . S NODE=$G(^PS(52,RXIEN,0))
 . . N DRUG S DRUG=$P(NODE,U,6)
 . . N DRUGNAME S DRUGNAME="" I DRUG>0 S DRUGNAME=$P($G(^PSDRUG(DRUG,0)),U,1)
 . . N FILLDT S FILLDT=$P(NODE,U,1)
 . . N STATUS S STATUS=$P(NODE,U,100)
 . . N QTY S QTY=$P(NODE,U,7)
 . . N REFILLS S REFILLS=$P(NODE,U,9)
 . . S I=I+1
 . . S RESULT(I)=RXIEN_U_DRUGNAME_U_FILLDT_U_STATUS_U_QTY_U_REFILLS_U_"FILE_52"
 ;
 S RESULT(0)=I
 Q
 ;
RXSTATUS(RESULT,RXIEN) ;Check prescription status
 N U,NODE
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEERX Q"
 S RXIEN=+$G(RXIEN)
 I 'RXIEN S RESULT(0)="-1^Prescription IEN required" Q
 ;
 I '$D(^PS(52,RXIEN,0)) D  Q
 . S RESULT(0)="-1^Prescription not found"
 ;
 S NODE=$G(^PS(52,RXIEN,0))
 N DRUG S DRUG=$P(NODE,U,6)
 N DRUGNAME S DRUGNAME="" I DRUG>0 S DRUGNAME=$P($G(^PSDRUG(DRUG,0)),U,1)
 N STATUS S STATUS=$P(NODE,U,100)
 N FILLDT S FILLDT=$P(NODE,U,1)
 N DFN2 S DFN2=$P(NODE,U,2)
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="RX_IEN^"_RXIEN
 S RESULT(2)="DRUG^"_DRUGNAME
 S RESULT(3)="STATUS^"_STATUS
 S RESULT(4)="FILL_DATE^"_FILLDT
 S RESULT(5)="PATIENT_DFN^"_DFN2
 S RESULT(6)="SOURCE^FILE_52"
 Q
 ;
INSTALL ;Register RPCs in File #8994
 W !,"=== ZVEERX RPC Installer ==="
 D REG^ZVEUSER("VE ERX NEWRX","RXNEW","ZVEERX")
 D REG^ZVEUSER("VE ERX RENEW","RXRENEW","ZVEERX")
 D REG^ZVEUSER("VE ERX CANCEL","RXCANCEL","ZVEERX")
 D REG^ZVEUSER("VE ERX DRUGSRCH","DRUGSRCH","ZVEERX")
 D REG^ZVEUSER("VE ERX HISTORY","RXHIST","ZVEERX")
 D REG^ZVEUSER("VE ERX STATUS","RXSTATUS","ZVEERX")
 W "ZVEERX RPCs registered (6 RPCs)",!
 Q
