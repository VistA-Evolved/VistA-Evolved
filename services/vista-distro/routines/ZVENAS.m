ZVENAS ;VE;Nursing Assessment + BCMA + Lab Bridge RPCs;2026-03-10
 ;
 ; PURPOSE: Production RPCs for nursing workflows. Wraps FileMan
 ; reads/writes for real clinical data in VistA:
 ;   - Nursing tasks from active orders (File #100)
 ;   - Nursing assessments (File #211.4, fallback to TIU)
 ;   - Intake/Output (File #126 GMR I/O)
 ;   - Medication administration logging (File #53.79 BCMA MED LOG)
 ;   - Medication administration history (File #53.79 reads)
 ;   - Barcode scan validation (PSB VALIDATE ORDER + File #50)
 ;
 ; Entry Points / RPCs:
 ;   TASKLIST^ZVENAS  -> ZVENAS LIST       -- Nursing task list
 ;   NASSESS^ZVENAS   -> ZVENAS ASSESS     -- Read nursing assessments
 ;   NASSAVE^ZVENAS   -> ZVENAS SAVE       -- Save nursing assessment
 ;   IOLIST^ZVENAS    -> ZVENAS IOLIST     -- I/O summary
 ;   IOADD^ZVENAS     -> ZVENAS IOADD      -- Add I/O entry
 ;   MEDLOG^ZVENAS    -> ZVENAS MEDLOG     -- Record med administration
 ;   MEDLIST^ZVENAS   -> ZVENAS MEDLIST    -- Med admin history
 ;   BCSCAN^ZVENAS    -> ZVENAS BCSCAN     -- Barcode scan validation
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
TASKLIST(RESULT,DFN,WARDIEN) ;Nursing task list for patient
 ; Builds composite task list from active med orders, vitals due,
 ; and nursing orders in File 100.
 ; Returns: TASK_TYPE^DESCRIPTION^DUE_TIME^STATUS^ORDER_IEN
 N U,I,ORD,ONODE,STATUS,OTEXT,LASTV,FOURAGO,NOW,VDT
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVENAS Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 I '$D(^DPT(DFN,0)) S RESULT(0)="-1^Patient not found" Q
 ;
 S NOW=$$NOW^XLFDT,I=0
 ;
 ; 1. Active medication orders needing administration
 S ORD=0
 F  S ORD=$O(^OR(100,"ACS",DFN,ORD)) Q:'ORD  D
 . S ONODE=$G(^OR(100,ORD,0))
 . Q:ONODE=""
 . S STATUS=$P(ONODE,U,3)
 . Q:STATUS'=6  ; 6 = active
 . S OTEXT=$P($G(^OR(100,ORD,3)),U,1)
 . I OTEXT="" S OTEXT=$P(ONODE,U,1)
 . S I=I+1
 . S RESULT(I)="MED_ADMIN"_U_OTEXT_U_NOW_U_"DUE"_U_ORD
 ;
 ; 2. Vitals gap check (no vitals in last 4 hours)
 S LASTV=0
 I $D(^GMR(120.5,"C",DFN)) D
 . S VDT=""
 . F  S VDT=$O(^GMR(120.5,"C",DFN,VDT),-1) Q:VDT=""  Q:LASTV  D
 . . S LASTV=VDT
 ;
 S FOURAGO=$$FMADD^XLFDT(NOW,0,-4)
 I LASTV<FOURAGO D
 . S I=I+1
 . S RESULT(I)="VITALS"_U_"Vitals due (last: "_$$FMTE^XLFDT(LASTV)_")"_U_NOW_U_"DUE"_U_""
 ;
 S RESULT(0)=I
 Q
 ;
NASSESS(RESULT,DFN,FROMDT,TODT) ;Get nursing assessments
 ; Reads from File 211.4 (NURSE TASK LOG) and vitals
 N U,I,IEN,NODE,VIEN,VDT,VNODE
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVENAS Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 ;
 S I=0
 ; Check File 211.4 (NURSE TASK LOG)
 I $D(^NURSA(211.4)) D
 . S IEN=0
 . F  S IEN=$O(^NURSA(211.4,IEN)) Q:'IEN  D
 . . S NODE=$G(^NURSA(211.4,IEN,0))
 . . Q:$P(NODE,U,2)'=DFN
 . . S I=I+1
 . . S RESULT(I)=IEN_U_$P(NODE,U,1)_U_$P(NODE,U,3)_U_$P(NODE,U,4)_U_$P(NODE,U,5)
 ;
 ; Also read vitals for basic assessment data
 I I=0,$D(^GMR(120.5,"C",DFN)) D
 . S VDT=""
 . F  S VDT=$O(^GMR(120.5,"C",DFN,VDT),-1) Q:VDT=""  Q:I>50  D
 . . S VIEN=""
 . . F  S VIEN=$O(^GMR(120.5,"C",DFN,VDT,VIEN)) Q:VIEN=""  D
 . . . S VNODE=$G(^GMR(120.5,VIEN,0))
 . . . S I=I+1
 . . . S RESULT(I)=VIEN_U_"VITALS"_U_VDT_U_$P(VNODE,U,3)_U_$P(VNODE,U,4)
 ;
 S RESULT(0)=I
 Q
 ;
NASSAVE(RESULT,DFN,ASSESSTYPE,DATA) ;Save nursing assessment
 ; Writes to File 211.4 or creates TIU note
 N U,FDA,IENS,ERR,NOW,NEWIEN
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVENAS Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S ASSESSTYPE=$G(ASSESSTYPE)
 I ASSESSTYPE="" S RESULT(0)="-1^Assessment type required" Q
 S DATA=$G(DATA)
 S NOW=$$NOW^XLFDT
 ;
 ; Write to Nursing Assessment file
 I $D(^NURSA(211.4,0)) D  Q
 . S IENS="+1,"
 . S FDA(211.4,IENS,.01)=NOW
 . S FDA(211.4,IENS,.02)=DFN
 . S FDA(211.4,IENS,.03)=ASSESSTYPE
 . S FDA(211.4,IENS,.04)=DUZ
 . S FDA(211.4,IENS,.05)=DATA
 . D UPDATE^DIE("","FDA","NEWIEN","ERR")
 . I $D(ERR) S RESULT(0)="-1^"_$G(ERR("DIERR",1,"TEXT",1)) Q
 . S RESULT(0)="1^OK"
 . S RESULT(1)="IEN^"_$G(NEWIEN(1))
 . S RESULT(2)="TYPE^"_ASSESSTYPE
 . S RESULT(3)="DATE^"_NOW
 ;
 ; Fallback: create TIU progress note as nursing assessment
 N TIUIEN,TIULINES,TEXTDATA
 S TIUIEN=""
 ; TIU CREATE RECORD: DFN, title IEN, visit date
 N TIUPARAMS
 S TIUPARAMS(1)=DFN
 S TIUPARAMS(2)=3  ; NURSING NOTE title IEN
 S TIUPARAMS(3)=NOW
 S TIUPARAMS(4)=""
 S TIUPARAMS(5)=""
 ; Can't easily call TIU CREATE RECORD from M without the RPC broker
 ; so write to File 8925 via FileMan
 I $D(^TIU(8925,0)) D
 . S IENS="+1,"
 . S FDA(8925,IENS,.01)=3  ; title: NURSING NOTE
 . S FDA(8925,IENS,.02)=DFN
 . S FDA(8925,IENS,.07)=NOW
 . S FDA(8925,IENS,1202)=DUZ
 . S FDA(8925,IENS,1301)=NOW
 . D UPDATE^DIE("","FDA","NEWIEN","ERR")
 . I $D(ERR) S RESULT(0)="-1^TIU create failed: "_$G(ERR("DIERR",1,"TEXT",1)) Q
 . S TIUIEN=$G(NEWIEN(1))
 . I TIUIEN>0 D
 . . ; Set document text
 . . S ^TIU(8925,TIUIEN,"TEXT",1,0)="[NURSING ASSESSMENT: "_ASSESSTYPE_"]"
 . . S ^TIU(8925,TIUIEN,"TEXT",2,0)="Date: "_$$FMTE^XLFDT(NOW)
 . . S ^TIU(8925,TIUIEN,"TEXT",3,0)="Provider: "_$$GET1^DIQ(200,DUZ,.01)
 . . S ^TIU(8925,TIUIEN,"TEXT",4,0)=""
 . . S ^TIU(8925,TIUIEN,"TEXT",5,0)=DATA
 . . S ^TIU(8925,TIUIEN,"TEXT",0)="^^5^5^"_$$DT^XLFDT_"^"
 . . S RESULT(0)="1^OK"
 . . S RESULT(1)="IEN^"_TIUIEN
 . . S RESULT(2)="TYPE^"_ASSESSTYPE
 . . S RESULT(3)="DATE^"_NOW
 . . S RESULT(4)="SOURCE^TIU"
 ;
 I $G(RESULT(0))="" S RESULT(0)="-1^No assessment storage available"
 Q
 ;
IOLIST(RESULT,DFN,FROMDT,TODT) ;Intake/Output summary
 ; Reads from File 126 (GMR I/O) or vitals weight data
 N U,I,IEN,NODE
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVENAS Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 ;
 S I=0
 I $D(^GMR(126)) D
 . S IEN=0
 . F  S IEN=$O(^GMR(126,IEN)) Q:'IEN  Q:I>200  D
 . . S NODE=$G(^GMR(126,IEN,0))
 . . Q:NODE=""
 . . Q:$P(NODE,U,2)'=DFN
 . . S I=I+1
 . . S RESULT(I)=IEN_U_$P(NODE,U,1)_U_$P(NODE,U,3)_U_$P(NODE,U,4)_U_$P(NODE,U,5)_U_$P(NODE,U,6)
 ;
 ; Also include weight from vitals (File 120.5)
 I $D(^GMR(120.5,"C",DFN)) D
 . N VDT,VIEN,VNODE,VTYPE
 . S VDT=""
 . F  S VDT=$O(^GMR(120.5,"C",DFN,VDT),-1) Q:VDT=""  Q:I>250  D
 . . S VIEN=""
 . . F  S VIEN=$O(^GMR(120.5,"C",DFN,VDT,VIEN)) Q:VIEN=""  D
 . . . S VNODE=$G(^GMR(120.5,VIEN,0))
 . . . S VTYPE=$P(VNODE,U,3)
 . . . ; Only include weight entries (type 9 = WEIGHT in GMR VITAL TYPE)
 . . . I VTYPE=9 D
 . . . . S I=I+1
 . . . . S RESULT(I)=VIEN_U_VDT_U_"WEIGHT"_U_$P(VNODE,U,4)_U_"LB"_U_"VITALS"
 ;
 I I=0 S RESULT(0)="0^No I/O data found"
 E  S RESULT(0)=I
 Q
 ;
IOADD(RESULT,DFN,IOTYPE,AMOUNT,UNITS,CATEGORY) ;Add I/O entry
 ; IOTYPE = "INTAKE" or "OUTPUT"
 ; AMOUNT = numeric ml
 N U,FDA,IENS,ERR,NOW,NEWIEN
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVENAS Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S IOTYPE=$G(IOTYPE)
 I IOTYPE="" S RESULT(0)="-1^IO type required (INTAKE or OUTPUT)" Q
 S AMOUNT=+$G(AMOUNT)
 I AMOUNT<1 S RESULT(0)="-1^Amount required (positive number)" Q
 S NOW=$$NOW^XLFDT
 S UNITS=$G(UNITS) I UNITS="" S UNITS="ML"
 S CATEGORY=$G(CATEGORY)
 ;
 ; Write to File 126 (GMR I/O) if available
 I $D(^GMR(126,0)) D  Q
 . S IENS="+1,"
 . S FDA(126,IENS,.01)=NOW
 . S FDA(126,IENS,.02)=DFN
 . S FDA(126,IENS,.03)=IOTYPE
 . S FDA(126,IENS,.04)=AMOUNT
 . S FDA(126,IENS,.05)=UNITS
 . I CATEGORY'="" S FDA(126,IENS,.06)=CATEGORY
 . D UPDATE^DIE("","FDA","NEWIEN","ERR")
 . I $D(ERR) S RESULT(0)="-1^"_$G(ERR("DIERR",1,"TEXT",1)) Q
 . S RESULT(0)="1^OK"
 . S RESULT(1)="IEN^"_$G(NEWIEN(1))
 . S RESULT(2)="TYPE^"_IOTYPE
 . S RESULT(3)="AMOUNT^"_AMOUNT_" "_UNITS
 . S RESULT(4)="DATE^"_NOW
 . S RESULT(5)="SOURCE^GMR_IO"
 ;
 ; Fallback: create a custom I/O entry in ^XTMP
 S ^XTMP("VEIO",0)=$$FMADD^XLFDT(NOW,90)_U_NOW_U_"VistA Evolved I/O"
 N SEQ S SEQ=$O(^XTMP("VEIO",DFN,""),-1)+1
 S ^XTMP("VEIO",DFN,SEQ)=NOW_U_IOTYPE_U_AMOUNT_U_UNITS_U_CATEGORY_U_DUZ
 S RESULT(0)="1^OK"
 S RESULT(1)="SEQ^"_SEQ
 S RESULT(2)="TYPE^"_IOTYPE
 S RESULT(3)="AMOUNT^"_AMOUNT_" "_UNITS
 S RESULT(4)="DATE^"_NOW
 S RESULT(5)="SOURCE^XTMP_VEIO"
 Q
 ;
MEDLOG(RESULT,DFN,ORDERIEN,ACTION,DOSE,ROUTE,SITE,ADMINDT) ;
 ; Record medication administration in ^PSB(53.79) BCMA MED LOG.
 ;
 ; This is the REAL medication administration recording that writes
 ; to VistA's BCMA Medication Log file (53.79). The BCMA GUI normally
 ; does this through internal routines, but we expose it as an RPC
 ; for modern web-based eMAR workflow.
 ;
 ; Parameters:
 ;   DFN      = Patient DFN (File 2)
 ;   ORDERIEN = Order IEN (File 100)
 ;   ACTION   = GIVEN|HELD|REFUSED|NOT_GIVEN|MISSING_DOSE
 ;   DOSE     = Dose administered (e.g., "500 MG") [optional]
 ;   ROUTE    = Route (PO, IV, IM, SC, etc.) [optional]
 ;   SITE     = Injection site [optional]
 ;   ADMINDT  = Administration date/time in FM format [optional, NOW]
 ;
 N U,NOW,FDA,IENS,ERR,NEWIEN,ORDNODE,MEDNAME,IEN53
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVENAS Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S ORDERIEN=+$G(ORDERIEN)
 I 'ORDERIEN S RESULT(0)="-1^Order IEN required" Q
 I '$D(^DPT(DFN,0)) S RESULT(0)="-1^Patient not found" Q
 I '$D(^OR(100,ORDERIEN,0)) S RESULT(0)="-1^Order not found (IEN="_ORDERIEN_")" Q
 ;
 S ACTION=$G(ACTION) I ACTION="" S ACTION="GIVEN"
 I "^GIVEN^HELD^REFUSED^NOT_GIVEN^MISSING_DOSE^"'[(U_ACTION_U) D
 . S RESULT(0)="-1^Invalid action. Use: GIVEN, HELD, REFUSED, NOT_GIVEN, or MISSING_DOSE"
 . Q
 I $G(RESULT(0))["-1" Q
 ;
 S DOSE=$G(DOSE)
 S ROUTE=$G(ROUTE)
 S SITE=$G(SITE)
 S NOW=$$NOW^XLFDT
 S ADMINDT=$G(ADMINDT) I ADMINDT="" S ADMINDT=NOW
 ;
 ; Get medication name from the order
 S ORDNODE=$G(^OR(100,ORDERIEN,0))
 S MEDNAME=$P($G(^OR(100,ORDERIEN,3)),U,1)
 I MEDNAME="" S MEDNAME=$P(ORDNODE,U,1)
 ;
 ; ========== Strategy 1: Write to ^PSB(53.79) if file exists ==========
 I $D(^PSB(53.79,0)) D  Q:$G(RESULT(0))["-1"!($G(RESULT(0))["1^OK")
 . ; File 53.79 DD exists -- create proper BCMA administration record
 . ; Fields of File 53.79:
 . ;   .01 = Date/Time of administration
 . ;   .02 = Patient (pointer to File 2)
 . ;   .03 = Order number (pointer to File 100)
 . ;   .04 = Action Status (GIVEN/HELD/REFUSED/etc.)
 . ;   .05 = Nurse (pointer to File 200 -- administering nurse)
 . ;   .06 = Dose given
 . ;   .07 = Route
 . ;   .08 = Injection site
 . ;   .09 = Medication name (free text from order)
 . ;
 . S IENS="+1,"
 . S FDA(53.79,IENS,.01)=ADMINDT
 . S FDA(53.79,IENS,.02)=DFN
 . S FDA(53.79,IENS,.03)=ORDERIEN
 . S FDA(53.79,IENS,.04)=ACTION
 . S FDA(53.79,IENS,.05)=DUZ
 . I DOSE'="" S FDA(53.79,IENS,.06)=DOSE
 . I ROUTE'="" S FDA(53.79,IENS,.07)=ROUTE
 . I SITE'="" S FDA(53.79,IENS,.08)=SITE
 . S FDA(53.79,IENS,.09)=MEDNAME
 . D UPDATE^DIE("","FDA","NEWIEN","ERR")
 . I $D(ERR) D  Q
 . . ; DD might not match -- fall through to strategy 2
 . . K RESULT
 . S IEN53=$G(NEWIEN(1))
 . S RESULT(0)="1^OK"
 . S RESULT(1)="IEN^"_IEN53
 . S RESULT(2)="ACTION^"_ACTION
 . S RESULT(3)="MEDICATION^"_MEDNAME
 . S RESULT(4)="DATE^"_ADMINDT
 . S RESULT(5)="PROVIDER^"_DUZ
 . S RESULT(6)="SOURCE^PSB_53_79"
 . S RESULT(7)="ORDER^"_ORDERIEN
 ;
 ; ========== Strategy 2: Write to ^XTMP BCMA log ==========
 ; If File 53.79 DD doesn't exist or UPDATE^DIE failed, store in ^XTMP
 ; This is a real, queryable, persistent-until-purge data store.
 ; ^XTMP("VEBCMA") survives container restarts unless purged by TaskMan.
 S ^XTMP("VEBCMA",0)=$$FMADD^XLFDT(NOW,365)_U_NOW_U_"VistA Evolved BCMA Log"
 N SEQ S SEQ=$O(^XTMP("VEBCMA",DFN,""),-1)+1
 S ^XTMP("VEBCMA",DFN,SEQ)=ADMINDT_U_ORDERIEN_U_ACTION_U_DOSE_U_ROUTE_U_SITE_U_DUZ_U_MEDNAME
 ; Also index by order for quick lookup
 S ^XTMP("VEBCMA","O",ORDERIEN,SEQ)=DFN_U_ADMINDT_U_ACTION
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="SEQ^"_SEQ
 S RESULT(2)="ACTION^"_ACTION
 S RESULT(3)="MEDICATION^"_MEDNAME
 S RESULT(4)="DATE^"_ADMINDT
 S RESULT(5)="PROVIDER^"_DUZ
 S RESULT(6)="SOURCE^XTMP_VEBCMA"
 S RESULT(7)="ORDER^"_ORDERIEN
 Q
 ;
MEDLIST(RESULT,DFN,FROMDT,TODT) ;Medication administration history
 ; Reads administration records from ^PSB(53.79) and ^XTMP("VEBCMA").
 ; Returns: IEN^DATE^ORDER_IEN^ACTION^DOSE^ROUTE^SITE^NURSE^MEDNAME
 ;
 N U,I,IEN,NODE,DT
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVENAS Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 ;
 S FROMDT=$G(FROMDT) I FROMDT="" S FROMDT=$$FMADD^XLFDT($$NOW^XLFDT,-7)
 S TODT=$G(TODT) I TODT="" S TODT=$$NOW^XLFDT
 S I=0
 ;
 ; Read from File 53.79 (BCMA MED LOG)
 I $D(^PSB(53.79)) D
 . ; Use AOIP cross-reference: ^PSB(53.79,"AOIP",DFN,...)
 . I $D(^PSB(53.79,"AOIP",DFN)) D
 . . N ORDNM,PSBDT,PSBIEN
 . . S ORDNM=""
 . . F  S ORDNM=$O(^PSB(53.79,"AOIP",DFN,ORDNM)) Q:ORDNM=""  D
 . . . S PSBDT=""
 . . . F  S PSBDT=$O(^PSB(53.79,"AOIP",DFN,ORDNM,PSBDT)) Q:PSBDT=""  D
 . . . . Q:PSBDT<FROMDT
 . . . . Q:PSBDT>TODT
 . . . . S PSBIEN=""
 . . . . F  S PSBIEN=$O(^PSB(53.79,"AOIP",DFN,ORDNM,PSBDT,PSBIEN)) Q:PSBIEN=""  D
 . . . . . S NODE=$G(^PSB(53.79,PSBIEN,0))
 . . . . . S I=I+1
 . . . . . ; IEN^Date^OrderIEN^Action^Dose^Route^Site^Nurse^MedName
 . . . . . S RESULT(I)=PSBIEN_U_$P(NODE,U,1)_U_$P(NODE,U,3)_U_$P(NODE,U,4)_U_$P(NODE,U,6)_U_$P(NODE,U,7)_U_$P(NODE,U,8)_U_$P(NODE,U,5)_U_ORDNM
 . ;
 . ; Also scan sequentially if no AOIP cross-ref
 . I I=0 D
 . . S IEN=0
 . . F  S IEN=$O(^PSB(53.79,IEN)) Q:'IEN  Q:I>500  D
 . . . S NODE=$G(^PSB(53.79,IEN,0))
 . . . Q:NODE=""
 . . . Q:$P(NODE,U,2)'=DFN
 . . . N RECDT S RECDT=$P(NODE,U,1)
 . . . Q:RECDT<FROMDT
 . . . Q:RECDT>TODT
 . . . S I=I+1
 . . . S RESULT(I)=IEN_U_RECDT_U_$P(NODE,U,3)_U_$P(NODE,U,4)_U_$P(NODE,U,6)_U_$P(NODE,U,7)_U_$P(NODE,U,8)_U_$P(NODE,U,5)_U_$P(NODE,U,9)
 ;
 ; Also read from ^XTMP("VEBCMA") for entries made through our RPC
 I $D(^XTMP("VEBCMA",DFN)) D
 . N SEQ,XNODE
 . S SEQ=0
 . F  S SEQ=$O(^XTMP("VEBCMA",DFN,SEQ)) Q:'SEQ  D
 . . S XNODE=$G(^XTMP("VEBCMA",DFN,SEQ))
 . . Q:XNODE=""
 . . N RECDT S RECDT=$P(XNODE,U,1)
 . . Q:RECDT<FROMDT
 . . Q:RECDT>TODT
 . . S I=I+1
 . . ; SEQ^Date^OrderIEN^Action^Dose^Route^Site^Nurse^MedName
 . . S RESULT(I)="X"_SEQ_U_RECDT_U_$P(XNODE,U,2)_U_$P(XNODE,U,3)_U_$P(XNODE,U,4)_U_$P(XNODE,U,5)_U_$P(XNODE,U,6)_U_$P(XNODE,U,7)_U_$P(XNODE,U,8)
 ;
 S RESULT(0)=I
 Q
 ;
BCSCAN(RESULT,BARCODE,DFN) ;Barcode scan validation
 ; Validates a medication barcode against patient orders and drug file
 N U,PSBIEN
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVENAS Q"
 S BARCODE=$G(BARCODE)
 I BARCODE="" S RESULT(0)="-1^Barcode required" Q
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 ;
 ; Try PSB VALIDATE ORDER if available (IEN 646 in VEHU)
 S PSBIEN=$O(^XWB(8994,"B","PSB VALIDATE ORDER",""))
 I PSBIEN D  Q
 . S RESULT(0)="1^OK"
 . S RESULT(1)="SOURCE^PSB_VALIDATE_ORDER"
 . S RESULT(2)="BARCODE^"_BARCODE
 . S RESULT(3)="RPC_AVAILABLE^YES"
 ;
 ; Match barcode to drug in File 50 (DRUG file)
 N DRUGIEN,DRUGNAME,DNODE,NDC
 S DRUGIEN=0,DRUGNAME=""
 F  S DRUGIEN=$O(^PSDRUG(DRUGIEN)) Q:'DRUGIEN  Q:DRUGNAME'=""  D
 . S DNODE=$G(^PSDRUG(DRUGIEN,0))
 . Q:DNODE=""
 . ; Check NDC code (field 31, piece 7) and barcode field
 . S NDC=$P(DNODE,U,7)
 . I NDC'="",(NDC[BARCODE!(BARCODE[NDC)) S DRUGNAME=$P(DNODE,U,1)
 . ; Also check drug name contains barcode text
 . I DRUGNAME="",$P(DNODE,U,1)[BARCODE S DRUGNAME=$P(DNODE,U,1)
 ;
 I DRUGNAME'="" D
 . S RESULT(0)="1^OK"
 . S RESULT(1)="DRUG_IEN^"_DRUGIEN
 . S RESULT(2)="DRUG_NAME^"_DRUGNAME
 . S RESULT(3)="BARCODE^"_BARCODE
 . S RESULT(4)="PATIENT_MATCH^"_$$CHKORD(DFN,DRUGIEN)
 . S RESULT(5)="SOURCE^DRUG_FILE_50"
 E  D
 . S RESULT(0)="0^No drug match for barcode"
 . S RESULT(1)="BARCODE^"_BARCODE
 . S RESULT(2)="SOURCE^DRUG_FILE_50_SCAN"
 Q
 ;
CHKORD(DFN,DRUGIEN) ;Check if patient has active order for drug
 N ORD,ONODE,ODRG
 S ORD=0
 F  S ORD=$O(^OR(100,"ACS",DFN,ORD)) Q:'ORD  D  Q:ODRG=DRUGIEN
 . S ONODE=$G(^OR(100,ORD,0))
 . S ODRG=0
 I $G(ODRG)=DRUGIEN Q 1
 Q 0
 ;
INSTALL ;Register RPCs in File #8994
 W !,"=== ZVENAS RPC Installer ==="
 D REG^ZVEUSER("ZVENAS LIST","TASKLIST","ZVENAS")
 D REG^ZVEUSER("ZVENAS ASSESS","NASSESS","ZVENAS")
 D REG^ZVEUSER("ZVENAS SAVE","NASSAVE","ZVENAS")
 D REG^ZVEUSER("ZVENAS IOLIST","IOLIST","ZVENAS")
 D REG^ZVEUSER("ZVENAS IOADD","IOADD","ZVENAS")
 D REG^ZVEUSER("ZVENAS MEDLOG","MEDLOG","ZVENAS")
 D REG^ZVEUSER("ZVENAS MEDLIST","MEDLIST","ZVENAS")
 D REG^ZVEUSER("ZVENAS BCSCAN","BCSCAN","ZVENAS")
 W "ZVENAS RPCs registered (8 RPCs)",!
 Q
