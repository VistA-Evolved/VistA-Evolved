ZVEADTW ;VE;ADT Write RPCs -- Admit/Transfer/Discharge;2026-03-10
 ;
 ; PURPOSE: Provide RPC-callable entry points for ADT operations that
 ; are normally done through VistA roll-and-scroll menus (DGPM package).
 ; These RPCs wrap FileMan DIE/DIC calls to edit the PATIENT MOVEMENT
 ; file (#405) and related files.
 ;
 ; Entry Points (registered as RPCs):
 ;   ADMIT^ZVEADTW  -> VE ADT ADMIT     -- Admit patient to ward
 ;   XFER^ZVEADTW   -> VE ADT TRANSFER  -- Transfer patient between wards
 ;   DISCH^ZVEADTW  -> VE ADT DISCHARGE -- Discharge patient
 ;   REGPAT^ZVEADTW -> VE REGISTER PAT  -- Register new patient in File #2
 ;
 ; Files Written:
 ;   ^DGPM(405)   -- PATIENT MOVEMENT
 ;   ^DPT(         -- PATIENT (File #2) for registration
 ;
 ; SAFETY: All writes use FileMan APIs (UPDATE^DIE, FILE^DIE).
 ; Every entry uses $ETRAP for error isolation.
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
ADMIT(RESULT,DFN,WARDIEN,SPECIEN,PROVIEN,ADMDT) ;Admit patient to ward
 ; DFN = patient IEN (File 2)
 ; WARDIEN = ward IEN (File 42)
 ; SPECIEN = treating specialty IEN (File 42.4) [optional]
 ; PROVIEN = attending provider IEN (File 200) [optional]
 ; ADMDT = admission date/time in FM format [optional, defaults to NOW]
 ;
 N U,FDA,IENS,ERR,MVIEN,NOW,MVTYPE
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEADTW Q"
 ;
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 I '$D(^DPT(DFN,0)) S RESULT(0)="-1^Patient not found (DFN="_DFN_")" Q
 ;
 S WARDIEN=+$G(WARDIEN)
 I 'WARDIEN S RESULT(0)="-1^Ward IEN required" Q
 I '$D(^DIC(42,WARDIEN,0)) S RESULT(0)="-1^Ward not found" Q
 ;
 S NOW=$$NOW^XLFDT
 S ADMDT=$G(ADMDT)
 I ADMDT="" S ADMDT=NOW
 ;
 ; Movement type 1 = ADMISSION (File 405.1)
 S MVTYPE=1
 I '$D(^DGPM(405.1,MVTYPE,0)) D
 . ; Find the admission type dynamically
 . S MVTYPE=0
 . F  S MVTYPE=$O(^DGPM(405.1,MVTYPE)) Q:'MVTYPE  Q:$P($G(^DGPM(405.1,MVTYPE,0)),U,1)["ADMIT"
 I 'MVTYPE S RESULT(0)="-1^ADMISSION movement type not found in File 405.1" Q
 ;
 ; Create PATIENT MOVEMENT entry
 S IENS="+1,"
 S FDA(405,IENS,.01)=ADMDT           ; Date/Time
 S FDA(405,IENS,.02)=MVTYPE          ; Transaction Type
 S FDA(405,IENS,.03)=WARDIEN         ; Ward
 S FDA(405,IENS,.04)=DFN             ; Patient (pointer to File 2)
 I $G(SPECIEN) S FDA(405,IENS,.07)=SPECIEN
 I $G(PROVIEN) S FDA(405,IENS,.08)=PROVIEN
 ;
 D UPDATE^DIE("","FDA","MVIEN","ERR")
 I $D(ERR) S RESULT(0)="-1^"_$G(ERR("DIERR",1,"TEXT",1)) Q
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="MOVEMENT_IEN^"_$G(MVIEN(1))
 S RESULT(2)="PATIENT^"_$P($G(^DPT(DFN,0)),U,1)
 S RESULT(3)="WARD^"_$P($G(^DIC(42,WARDIEN,0)),U,1)
 S RESULT(4)="DATE^"_ADMDT
 S RESULT(5)="TYPE^ADMISSION"
 Q
 ;
XFER(RESULT,DFN,TOWARDIEN,SPECIEN,PROVIEN,XFERDT) ;Transfer patient
 ; DFN = patient, TOWARDIEN = destination ward
 N U,FDA,IENS,ERR,MVIEN,NOW,MVTYPE
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEADTW Q"
 ;
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 I '$D(^DPT(DFN,0)) S RESULT(0)="-1^Patient not found" Q
 ;
 S TOWARDIEN=+$G(TOWARDIEN)
 I 'TOWARDIEN S RESULT(0)="-1^Destination ward IEN required" Q
 I '$D(^DIC(42,TOWARDIEN,0)) S RESULT(0)="-1^Ward not found" Q
 ;
 S NOW=$$NOW^XLFDT
 S XFERDT=$G(XFERDT) I XFERDT="" S XFERDT=NOW
 ;
 ; Movement type 2 = TRANSFER (File 405.1) -- find dynamically
 S MVTYPE=0
 F  S MVTYPE=$O(^DGPM(405.1,MVTYPE)) Q:'MVTYPE  Q:$P($G(^DGPM(405.1,MVTYPE,0)),U,1)["TRANSFER"
 I 'MVTYPE S MVTYPE=2  ; fallback
 ;
 S IENS="+1,"
 S FDA(405,IENS,.01)=XFERDT
 S FDA(405,IENS,.02)=MVTYPE
 S FDA(405,IENS,.03)=TOWARDIEN
 S FDA(405,IENS,.04)=DFN
 I $G(SPECIEN) S FDA(405,IENS,.07)=SPECIEN
 I $G(PROVIEN) S FDA(405,IENS,.08)=PROVIEN
 ;
 D UPDATE^DIE("","FDA","MVIEN","ERR")
 I $D(ERR) S RESULT(0)="-1^"_$G(ERR("DIERR",1,"TEXT",1)) Q
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="MOVEMENT_IEN^"_$G(MVIEN(1))
 S RESULT(2)="PATIENT^"_$P($G(^DPT(DFN,0)),U,1)
 S RESULT(3)="TO_WARD^"_$P($G(^DIC(42,TOWARDIEN,0)),U,1)
 S RESULT(4)="DATE^"_XFERDT
 S RESULT(5)="TYPE^TRANSFER"
 Q
 ;
DISCH(RESULT,DFN,DISCHDT,DISPIEN) ;Discharge patient
 ; DFN = patient
 ; DISCHDT = discharge date/time [optional, defaults to NOW]
 ; DISPIEN = disposition IEN [optional]
 N U,FDA,IENS,ERR,MVIEN,NOW,MVTYPE,LASTWARD
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEADTW Q"
 ;
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 I '$D(^DPT(DFN,0)) S RESULT(0)="-1^Patient not found" Q
 ;
 S NOW=$$NOW^XLFDT
 S DISCHDT=$G(DISCHDT) I DISCHDT="" S DISCHDT=NOW
 ;
 ; Find last ward for the patient from movement history
 S LASTWARD=""
 N MVDT,MV
 S MVDT="" F  S MVDT=$O(^DGPM("APTT",DFN,MVDT)) Q:MVDT=""  D
 . S MV="" F  S MV=$O(^DGPM("APTT",DFN,MVDT,MV)) Q:MV=""  D
 . . S LASTWARD=$P($G(^DGPM(405,MV,0)),U,3)
 ;
 ; Movement type 3 = DISCHARGE (File 405.1) -- find dynamically
 S MVTYPE=0
 F  S MVTYPE=$O(^DGPM(405.1,MVTYPE)) Q:'MVTYPE  Q:$P($G(^DGPM(405.1,MVTYPE,0)),U,1)["DISCHARGE"
 I 'MVTYPE S MVTYPE=3  ; fallback
 ;
 S IENS="+1,"
 S FDA(405,IENS,.01)=DISCHDT
 S FDA(405,IENS,.02)=MVTYPE
 I LASTWARD S FDA(405,IENS,.03)=LASTWARD
 S FDA(405,IENS,.04)=DFN
 I $G(DISPIEN) S FDA(405,IENS,.06)=DISPIEN
 ;
 D UPDATE^DIE("","FDA","MVIEN","ERR")
 I $D(ERR) S RESULT(0)="-1^"_$G(ERR("DIERR",1,"TEXT",1)) Q
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="MOVEMENT_IEN^"_$G(MVIEN(1))
 S RESULT(2)="PATIENT^"_$P($G(^DPT(DFN,0)),U,1)
 S RESULT(3)="DATE^"_DISCHDT
 S RESULT(4)="TYPE^DISCHARGE"
 Q
 ;
REGPAT(RESULT,NAME,SSN,DOB,SEX) ;Register new patient in File #2
 ; NAME = patient name (LAST,FIRST)
 ; SSN = social security number
 ; DOB = date of birth (FM format or MM/DD/YYYY)
 ; SEX = M or F
 N U,DIC,DA,X,Y,DLAYGO,FDA,IENS,ERR,NEWIEN
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEADTW Q"
 ;
 S NAME=$G(NAME)
 I NAME="" S RESULT(0)="-1^Patient name required (LAST,FIRST)" Q
 S SSN=$G(SSN),DOB=$G(DOB),SEX=$G(SEX)
 ;
 ; Create patient via DIC lookup-add
 S DIC="^DPT(",DIC(0)="L",X=NAME,DLAYGO=2
 D ^DIC
 I +Y<1 S RESULT(0)="-1^Failed to create patient: "_$G(Y) Q
 S NEWIEN=+Y
 ;
 ; Set additional fields
 S IENS=NEWIEN_","
 I SSN'="" S FDA(2,IENS,.09)=SSN
 I DOB'="" S FDA(2,IENS,.03)=DOB
 I SEX'="" S FDA(2,IENS,.02)=SEX
 ;
 I $D(FDA) D
 . D FILE^DIE("E","FDA","ERR")
 . I $D(ERR) S RESULT(0)="-1^Created DFN "_NEWIEN_" but demographics update failed" Q
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="DFN^"_NEWIEN
 S RESULT(2)="NAME^"_NAME
 S RESULT(3)="SSN^"_SSN
 S RESULT(4)="DOB^"_DOB
 S RESULT(5)="SEX^"_SEX
 Q
 ;
INSTALL ;Register RPCs in File #8994
 W !,"=== ZVEADTW RPC Installer ==="
 D REG^ZVEUSER("VE ADT ADMIT","ADMIT","ZVEADTW")
 D REG^ZVEUSER("VE ADT TRANSFER","XFER","ZVEADTW")
 D REG^ZVEUSER("VE ADT DISCHARGE","DISCH","ZVEADTW")
 D REG^ZVEUSER("VE REGISTER PAT","REGPAT","ZVEADTW")
 W "ZVEADTW RPCs registered",!
 Q
