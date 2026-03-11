ZVEMEDREC ;VE;Medication Reconciliation RPCs;2026-03-10
 ;
 ; PURPOSE: Medication reconciliation (MedRec) RPCs that write
 ; reconciliation results back to VistA. MedRec involves comparing
 ; medications from different sources (admission, transfer, discharge)
 ; and documenting decisions (continue, discontinue, modify, new).
 ;
 ; VistA Medication Architecture:
 ;   File 52   = PHARMACY PATIENT (^PS(52)) -- outpatient Rx
 ;   File 53.79 = BCMA MED LOG (^PSB(53.79)) -- admin history
 ;   File 55   = PHARMACY PATIENT (inpatient ^PS(55))
 ;   File 100  = ORDER (^OR(100)) -- order records
 ;   File 8925 = TIU DOCUMENT (^TIU(8925)) -- reconciliation notes
 ;
 ; Entry Points / RPCs:
 ;   RECONCILE^ZVEMEDREC -> VE MEDREC RECONCILE -- Save reconciliation
 ;   MEDLIST^ZVEMEDREC   -> VE MEDREC MEDLIST   -- Get combined med list
 ;   HISTORY^ZVEMEDREC   -> VE MEDREC HISTORY   -- Reconciliation history
 ;   OUTSRC^ZVEMEDREC    -> VE MEDREC OUTSRC    -- Record outside meds
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
RECONCILE(RESULT,DFN,MEDIEN,ACTION,REASON,NOTES) ;
 ; Record a medication reconciliation decision.
 ; ACTION = CONTINUE, DISCONTINUE, MODIFY, NEW, HOLD
 ; MEDIEN = order IEN from File #100 (or external med ref)
 ; REASON = clinical reason for decision
 ;
 N U,NOW,SEQ
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEMEDREC Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S MEDIEN=$G(MEDIEN)
 I MEDIEN="" S RESULT(0)="-1^Medication IEN or reference required" Q
 S ACTION=$G(ACTION) I ACTION="" S ACTION="CONTINUE"
 I "CONTINUE,DISCONTINUE,MODIFY,NEW,HOLD"'[ACTION D
 . S RESULT(0)="-1^Invalid action: "_ACTION_". Use CONTINUE/DISCONTINUE/MODIFY/NEW/HOLD"
 I $G(RESULT(0))["-1" Q
 S REASON=$G(REASON)
 S NOTES=$G(NOTES)
 S NOW=$$NOW^XLFDT
 ;
 ; Store reconciliation decision in ^XTMP("VEMEDREC")
 S ^XTMP("VEMEDREC",0)=$$FMADD^XLFDT(NOW,365)_U_NOW_U_"VE Med Reconciliation"
 S SEQ=$O(^XTMP("VEMEDREC",DFN,""),-1)+1
 S ^XTMP("VEMEDREC",DFN,SEQ)=NOW_U_MEDIEN_U_ACTION_U_DUZ_U_REASON
 I NOTES'="" S ^XTMP("VEMEDREC",DFN,SEQ,"NOTES")=NOTES
 ;
 ; If DISCONTINUE, attempt to DC the order via ORWDXA DC
 I ACTION="DISCONTINUE",MEDIEN?1N.N D
 . N DCRESULT
 . ; Try the DC RPC if order exists in File 100
 . I $D(^OR(100,+MEDIEN,0)) D
 . . ; Set up DC reason as text
 . . S DCRESULT=$$DCRPC(+MEDIEN,DUZ,$G(REASON))
 . . S ^XTMP("VEMEDREC",DFN,SEQ,"DCRESULT")=DCRESULT
 ;
 ; If MODIFY or NEW, record for provider to create new order
 I ACTION="MODIFY"!(ACTION="NEW") D
 . S ^XTMP("VEMEDREC",DFN,SEQ,"ORDERNEEDED")=1
 ;
 ; Create TIU reconciliation note entry
 N NOTEIEN
 S NOTEIEN=$$RECNOTE(DFN,MEDIEN,ACTION,REASON,NOTES)
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="SEQ^"_SEQ
 S RESULT(2)="DFN^"_DFN
 S RESULT(3)="MEDIEN^"_MEDIEN
 S RESULT(4)="ACTION^"_ACTION
 S RESULT(5)="PROVIDER^"_DUZ
 S RESULT(6)="NOTE_IEN^"_NOTEIEN
 S RESULT(7)="DATE^"_NOW
 S RESULT(8)="SOURCE^XTMP_VEMEDREC"
 Q
 ;
DCRPC(ORDIEN,PROVDUZ,REASON) ;Internal: attempt ORWDXA DC
 N ORY
 ; ORWDXA DC expects: ORDERIEN^NATURE^ESSION^REASON^PROVIDER
 ; nature=1=written, esCode is provider verify, reason is text
 S ORY=""
 D  ; wrapped call
 . N $ETRAP S $ETRAP="S ORY=""DC_FAILED"" Q"
 . ; Simple DC attempt
 . I $T(^ORWDXA)'="" D EN^ORWDXA(.ORY,"DC",ORDIEN,,PROVDUZ)
 I ORY="" S ORY="DC_NOT_ATTEMPTED"
 Q ORY
 ;
RECNOTE(DFN,MEDIEN,ACTION,REASON,NOTES) ;Internal: create recon TIU note
 N NOTEIEN,FDA,IENS,ERR,NEWIEN,NOW,MEDNAME
 S NOTEIEN=""
 I '$D(^TIU(8925,0)) Q ""
 S NOW=$$NOW^XLFDT
 ; Get medication name
 S MEDNAME=""
 I MEDIEN?1N.N,$D(^OR(100,+MEDIEN,0)) S MEDNAME=$P(^OR(100,+MEDIEN,0),U,2)
 I MEDNAME="" S MEDNAME="Med #"_MEDIEN
 ;
 S IENS="+1,"
 S FDA(8925,IENS,.01)=10  ; PROGRESS NOTE
 S FDA(8925,IENS,.02)=DFN
 S FDA(8925,IENS,.07)=NOW
 S FDA(8925,IENS,1202)=DUZ
 S FDA(8925,IENS,1301)=NOW
 D UPDATE^DIE("","FDA","NEWIEN","ERR")
 I $D(ERR) Q ""
 ;
 S NOTEIEN=$G(NEWIEN(1))
 I 'NOTEIEN Q ""
 ;
 S ^TIU(8925,NOTEIEN,"TEXT",1,0)="[MEDICATION RECONCILIATION]"
 S ^TIU(8925,NOTEIEN,"TEXT",2,0)="Medication: "_MEDNAME
 S ^TIU(8925,NOTEIEN,"TEXT",3,0)="Decision: "_ACTION
 I REASON'="" S ^TIU(8925,NOTEIEN,"TEXT",4,0)="Reason: "_REASON
 I NOTES'="" S ^TIU(8925,NOTEIEN,"TEXT",5,0)="Notes: "_NOTES
 N LCNT S LCNT=5
 I REASON="" S LCNT=3
 I REASON'="",NOTES="" S LCNT=4
 S ^TIU(8925,NOTEIEN,"TEXT",0)="^^"_LCNT_"^"_LCNT_"^"_$$DT^XLFDT_"^"
 Q NOTEIEN
 ;
MEDLIST(RESULT,DFN) ;Get combined medication list for reconciliation
 ; Combines active orders from File 100 + outpatient from File 52
 ;
 N U,I,IEN,NODE,MEDNAME,STATUS,DRUGIEN
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEMEDREC Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 ;
 S I=0
 ; Source 1: Active orders from File 100
 I $D(^OR(100,"AC",DFN)) D
 . S IEN=0
 . F  S IEN=$O(^OR(100,"AC",DFN,IEN)) Q:'IEN  Q:I>200  D
 . . S NODE=$G(^OR(100,IEN,0))
 . . S MEDNAME=$P(NODE,U,2) Q:MEDNAME=""
 . . S STATUS=$P(NODE,U,3)
 . . S I=I+1
 . . S RESULT(I)="ORDER"_U_IEN_U_MEDNAME_U_STATUS_U_"FILE_100"
 ;
 ; Source 2: Outpatient Rx from File 52
 I $D(^PS(52,"B",DFN)) D
 . N RXIEN S RXIEN=0
 . F  S RXIEN=$O(^PS(52,"B",DFN,RXIEN)) Q:'RXIEN  Q:I>200  D
 . . S NODE=$G(^PS(52,RXIEN,0))
 . . S DRUGIEN=$P(NODE,U,6)
 . . S MEDNAME="" I DRUGIEN>0,$D(^PSDRUG(DRUGIEN,0)) S MEDNAME=$P(^PSDRUG(DRUGIEN,0),U,1)
 . . I MEDNAME="" S MEDNAME="Rx #"_RXIEN
 . . S STATUS=$P(NODE,U,100)
 . . S I=I+1
 . . S RESULT(I)="OUTPAT"_U_RXIEN_U_MEDNAME_U_STATUS_U_"FILE_52"
 ;
 ; Source 3: Reconciliation decisions already made
 I $D(^XTMP("VEMEDREC",DFN)) D
 . N SEQ S SEQ=0
 . F  S SEQ=$O(^XTMP("VEMEDREC",DFN,SEQ)) Q:'SEQ  Q:I>200  D
 . . N RECDATA S RECDATA=$G(^XTMP("VEMEDREC",DFN,SEQ))
 . . N MEDREF S MEDREF=$P(RECDATA,U,2)
 . . N RECACT S RECACT=$P(RECDATA,U,3)
 . . S I=I+1
 . . S RESULT(I)="RECONCILED"_U_MEDREF_U_RECACT_U_$P(RECDATA,U,1)_U_"XTMP"
 ;
 S RESULT(0)=I
 Q
 ;
HISTORY(RESULT,DFN) ;Reconciliation history
 ;
 N U,I,SEQ,RECDATA
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEMEDREC Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 ;
 S I=0
 I '$D(^XTMP("VEMEDREC",DFN)) S RESULT(0)=0 Q
 ;
 S SEQ=0
 F  S SEQ=$O(^XTMP("VEMEDREC",DFN,SEQ)) Q:'SEQ  Q:I>500  D
 . S RECDATA=$G(^XTMP("VEMEDREC",DFN,SEQ))
 . S I=I+1
 . S RESULT(I)=SEQ_U_$P(RECDATA,U,1)_U_$P(RECDATA,U,2)_U_$P(RECDATA,U,3)_U_$P(RECDATA,U,4)_U_$P(RECDATA,U,5)
 . I $D(^XTMP("VEMEDREC",DFN,SEQ,"NOTES")) S RESULT(I)=RESULT(I)_U_^XTMP("VEMEDREC",DFN,SEQ,"NOTES")
 ;
 S RESULT(0)=I
 Q
 ;
OUTSRC(RESULT,DFN,MEDNAME,DOSE,FREQ,ROUTE,STARTDT,PRESCRIBER) ;
 ; Record outside/community medication for reconciliation
 ; These are meds the patient reports taking from other providers
 ;
 N U,NOW,SEQ
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEMEDREC Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S MEDNAME=$G(MEDNAME)
 I MEDNAME="" S RESULT(0)="-1^Medication name required" Q
 S DOSE=$G(DOSE)
 S FREQ=$G(FREQ)
 S ROUTE=$G(ROUTE)
 S STARTDT=$G(STARTDT)
 S PRESCRIBER=$G(PRESCRIBER)
 S NOW=$$NOW^XLFDT
 ;
 ; Store outside med
 S ^XTMP("VEMEDREC",0)=$$FMADD^XLFDT(NOW,365)_U_NOW_U_"VE Med Reconciliation"
 N SEQBASE S SEQBASE="EXT"
 S SEQ=$O(^XTMP("VEMEDREC",DFN,SEQBASE,""),-1)+1
 S ^XTMP("VEMEDREC",DFN,SEQBASE,SEQ)=NOW_U_MEDNAME_U_DOSE_U_FREQ_U_ROUTE_U_STARTDT_U_PRESCRIBER_U_DUZ
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="SEQ^"_SEQ
 S RESULT(2)="MEDNAME^"_MEDNAME
 S RESULT(3)="SOURCE^XTMP_VEMEDREC_EXT"
 Q
 ;
INSTALL ;Register RPCs in File #8994
 W !,"=== ZVEMEDREC RPC Installer ==="
 D REG^ZVEUSER("VE MEDREC RECONCILE","RECONCILE","ZVEMEDREC")
 D REG^ZVEUSER("VE MEDREC MEDLIST","MEDLIST","ZVEMEDREC")
 D REG^ZVEUSER("VE MEDREC HISTORY","HISTORY","ZVEMEDREC")
 D REG^ZVEUSER("VE MEDREC OUTSRC","OUTSRC","ZVEMEDREC")
 W "ZVEMEDREC RPCs registered (4 RPCs)",!
 Q
