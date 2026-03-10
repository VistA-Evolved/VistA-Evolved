ZVELABW ;VE;Lab Order/Verify/Result Write RPCs;2026-03-10
 ;
 ; PURPOSE: Production RPCs for laboratory write operations that lack
 ; standard RPC Broker entry points.
 ;
 ; VistA Lab Architecture:
 ;   File 69   = LAB ORDER ENTRY (^LRO(69))
 ;   File 63   = LAB DATA / results (^LR)
 ;   File 60   = LABORATORY TEST (test catalog)
 ;   File 62   = COLLECTION SAMPLE
 ;   File 62.05 = URGENCY
 ;   File 68   = ACCESSION (^LRO(68))
 ;   File 100  = ORDER (CPRS orders -- labs route through here)
 ;
 ; Lab orders in CPRS normally go through ORWDX SAVE (universal order RPC).
 ; This routine provides DIRECT lab operations:
 ;   - Lab result entry (write to File 63)
 ;   - Lab result verification (tech/pathologist sign-off)
 ;   - Lab order status query
 ;   - Lab collection logging
 ;
 ; Entry Points / RPCs:
 ;   LABORD^ZVELABW   -> VE LAB ORDER       -- Place lab order
 ;   LABVER^ZVELABW   -> VE LAB VERIFY      -- Verify lab result
 ;   LABRES^ZVELABW   -> VE LAB RESULT      -- Enter lab result value
 ;   LABCOLL^ZVELABW  -> VE LAB COLLECT     -- Log specimen collection
 ;   LABSTAT^ZVELABW  -> VE LAB STATUS      -- Order status query
 ;   LABHIST^ZVELABW  -> VE LAB HISTORY     -- Patient lab history
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
LABORD(RESULT,DFN,TESTIEN,URGIEN,COLLDT,SPECIEN,COMMENT) ;Place lab order
 ; Creates a lab order entry in File 69 (LAB ORDER ENTRY)
 ; and optionally in File 100 (ORDER) via standard VistA order processing.
 ;
 ; Parameters:
 ;   DFN     = Patient DFN
 ;   TESTIEN = Lab test IEN from File 60
 ;   URGIEN  = Urgency IEN from File 62.05 [optional, defaults to ROUTINE]
 ;   COLLDT  = Collection date/time FM format [optional, NOW]
 ;   SPECIEN = Specimen IEN from File 62 [optional]
 ;   COMMENT = Order comment [optional]
 ;
 N U,NOW,FDA,IENS,ERR,NEWIEN,TESTNAME,URGNAME,LRDFN
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVELABW Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S TESTIEN=+$G(TESTIEN)
 I 'TESTIEN S RESULT(0)="-1^Lab test IEN required (File 60)" Q
 I '$D(^DPT(DFN,0)) S RESULT(0)="-1^Patient not found" Q
 I '$D(^LAB(60,TESTIEN,0)) S RESULT(0)="-1^Lab test not found (IEN="_TESTIEN_")" Q
 ;
 S TESTNAME=$P($G(^LAB(60,TESTIEN,0)),U,1)
 S NOW=$$NOW^XLFDT
 S URGIEN=+$G(URGIEN)
 ; Default urgency: ROUTINE (usually IEN 9 in File 62.05)
 I 'URGIEN S URGIEN=9
 S URGNAME=$P($G(^LAB(62.05,URGIEN,0)),U,1)
 I URGNAME="" S URGNAME="ROUTINE"
 S COLLDT=$G(COLLDT) I COLLDT="" S COLLDT=NOW
 S SPECIEN=+$G(SPECIEN)
 S COMMENT=$G(COMMENT)
 ;
 ; Get or create the Lab Reference Number (LRDFN) for this patient
 ; LRDFN lives in ^DPT(DFN,"LR") -- pointer to File 63
 S LRDFN=+$G(^DPT(DFN,"LR"))
 ;
 ; Write to File 69 (LAB ORDER ENTRY)
 I $D(^LRO(69,0)) D  Q:$G(RESULT(0))["-1"!($G(RESULT(0))["1^OK")
 . ; File 69 structure: ^LRO(69,inverse-date,1,seq-number)
 . ; The date subscript is the inverse FM date
 . N LRODT S LRODT=9999999-COLLDT
 . ; Find next sequence number under this date
 . N LRSN S LRSN=$O(^LRO(69,LRODT,1,""),-1)+1
 . I 'LRSN S LRSN=1
 . ;
 . ; Set the order entry
 . S ^LRO(69,LRODT,1,LRSN,0)=DFN_U_TESTIEN_U_SPECIEN_U_URGIEN_U_NOW_U_DUZ
 . S ^LRO(69,LRODT,1,LRSN,.1)=TESTNAME
 . I COMMENT'="" S ^LRO(69,LRODT,1,LRSN,.2)=COMMENT
 . ; Set cross-references
 . S ^LRO(69,"D",DFN,LRODT,LRSN)=""
 . ;
 . S RESULT(0)="1^OK"
 . S RESULT(1)="ORDER_DATE^"_COLLDT
 . S RESULT(2)="TEST^"_TESTNAME
 . S RESULT(3)="URGENCY^"_URGNAME
 . S RESULT(4)="SEQ^"_LRSN
 . S RESULT(5)="PROVIDER^"_DUZ
 . S RESULT(6)="SOURCE^LRO_69"
 ;
 ; Fallback: store in ^XTMP
 S ^XTMP("VELABORD",0)=$$FMADD^XLFDT(NOW,90)_U_NOW_U_"VistA Evolved Lab Orders"
 N SEQ S SEQ=$O(^XTMP("VELABORD",DFN,""),-1)+1
 S ^XTMP("VELABORD",DFN,SEQ)=COLLDT_U_TESTIEN_U_TESTNAME_U_URGIEN_U_URGNAME_U_DUZ_U_COMMENT
 S ^XTMP("VELABORD","T",TESTIEN,DFN,SEQ)=""
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="ORDER_DATE^"_COLLDT
 S RESULT(2)="TEST^"_TESTNAME
 S RESULT(3)="URGENCY^"_URGNAME
 S RESULT(4)="SEQ^"_SEQ
 S RESULT(5)="PROVIDER^"_DUZ
 S RESULT(6)="SOURCE^XTMP_VELABORD"
 Q
 ;
LABVER(RESULT,LRDFN,TESTIEN,ACCESSION,VERDUZ) ;Verify lab result
 ; Pathologist/tech verification of a lab result
 ; Sets the verified-by field and timestamp
 ;
 N U,NOW
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVELABW Q"
 S LRDFN=+$G(LRDFN)
 I 'LRDFN S RESULT(0)="-1^LRDFN (lab reference) required" Q
 S TESTIEN=+$G(TESTIEN)
 S ACCESSION=$G(ACCESSION)
 S VERDUZ=+$G(VERDUZ) I 'VERDUZ S VERDUZ=DUZ
 S NOW=$$NOW^XLFDT
 ;
 ; In VistA, lab verification sets specific fields in ^LR(LRDFN)
 ; The exact subscript depends on the test type (CH, MI, BB, etc.)
 ; For Chemistry (most common): ^LR(LRDFN,"CH",date,testien)
 ;
 I $D(^LR(LRDFN)) D  Q:$G(RESULT(0))["1^OK"
 . ; Find most recent unverified result for this test
 . N DT,FOUND S DT="",FOUND=0
 . F  S DT=$O(^LR(LRDFN,"CH",DT),-1) Q:DT=""  Q:FOUND  D
 . . I $D(^LR(LRDFN,"CH",DT,TESTIEN)) D
 . . . N RNODE S RNODE=$G(^LR(LRDFN,"CH",DT,TESTIEN))
 . . . ; Set verified flag and verifier
 . . . S $P(^LR(LRDFN,"CH",DT,TESTIEN),U,5)=VERDUZ
 . . . S $P(^LR(LRDFN,"CH",DT,TESTIEN),U,6)=NOW
 . . . S FOUND=1
 . . . S RESULT(0)="1^OK"
 . . . S RESULT(1)="LRDFN^"_LRDFN
 . . . S RESULT(2)="TEST^"_TESTIEN
 . . . S RESULT(3)="VERIFIED_BY^"_VERDUZ
 . . . S RESULT(4)="VERIFIED_AT^"_NOW
 . . . S RESULT(5)="SOURCE^LR_63_CH"
 . I 'FOUND S RESULT(0)="-1^No unverified result found for test IEN "_TESTIEN
 ;
 I $G(RESULT(0))="" S RESULT(0)="-1^Lab data file (^LR) not available for LRDFN "_LRDFN
 Q
 ;
LABRES(RESULT,DFN,TESTIEN,VALUE,UNITS,REFRANGE,ABNFLAG) ;Enter lab result
 ; Records a lab result value for a patient
 ; Writes to File 63 (LAB DATA) chemistry subscript
 ;
 N U,NOW,LRDFN,TESTNAME
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVELABW Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S TESTIEN=+$G(TESTIEN)
 I 'TESTIEN S RESULT(0)="-1^Lab test IEN required" Q
 S VALUE=$G(VALUE)
 I VALUE="" S RESULT(0)="-1^Result value required" Q
 ;
 S NOW=$$NOW^XLFDT
 S UNITS=$G(UNITS)
 S REFRANGE=$G(REFRANGE)
 S ABNFLAG=$G(ABNFLAG)
 S TESTNAME=$P($G(^LAB(60,TESTIEN,0)),U,1)
 S LRDFN=+$G(^DPT(DFN,"LR"))
 ;
 ; Write to ^LR (File 63) if LRDFN exists
 I LRDFN>0,$D(^LR(LRDFN)) D  Q:$G(RESULT(0))["1^OK"
 . ; Chemistry results: ^LR(LRDFN,"CH",date,testien)
 . ; Format: value^units^ref_range^abn_flag^verified_by^verified_dt
 . S ^LR(LRDFN,"CH",NOW,TESTIEN)=VALUE_U_UNITS_U_REFRANGE_U_ABNFLAG_U_""_U_""
 . S RESULT(0)="1^OK"
 . S RESULT(1)="LRDFN^"_LRDFN
 . S RESULT(2)="TEST^"_TESTNAME
 . S RESULT(3)="VALUE^"_VALUE
 . S RESULT(4)="UNITS^"_UNITS
 . S RESULT(5)="DATE^"_NOW
 . S RESULT(6)="STATUS^UNVERIFIED"
 . S RESULT(7)="SOURCE^LR_63_CH"
 ;
 ; Fallback: store in ^XTMP
 S ^XTMP("VELABRES",0)=$$FMADD^XLFDT(NOW,90)_U_NOW_U_"VistA Evolved Lab Results"
 N SEQ S SEQ=$O(^XTMP("VELABRES",DFN,""),-1)+1
 S ^XTMP("VELABRES",DFN,SEQ)=NOW_U_TESTIEN_U_TESTNAME_U_VALUE_U_UNITS_U_REFRANGE_U_ABNFLAG_U_DUZ
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="SEQ^"_SEQ
 S RESULT(2)="TEST^"_TESTNAME
 S RESULT(3)="VALUE^"_VALUE
 S RESULT(4)="UNITS^"_UNITS
 S RESULT(5)="DATE^"_NOW
 S RESULT(6)="STATUS^UNVERIFIED"
 S RESULT(7)="SOURCE^XTMP_VELABRES"
 Q
 ;
LABCOLL(RESULT,DFN,TESTIEN,COLLDT,TUBE,COLLBY) ;Log specimen collection
 ; Records that a specimen was collected for a lab order
 ;
 N U,NOW,TESTNAME
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVELABW Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S TESTIEN=+$G(TESTIEN)
 S NOW=$$NOW^XLFDT
 S COLLDT=$G(COLLDT) I COLLDT="" S COLLDT=NOW
 S TUBE=$G(TUBE)
 S COLLBY=+$G(COLLBY) I 'COLLBY S COLLBY=DUZ
 S TESTNAME=""
 I TESTIEN,$D(^LAB(60,TESTIEN,0)) S TESTNAME=$P(^LAB(60,TESTIEN,0),U,1)
 ;
 ; Log collection event in ^XTMP (production: write to File 69 collection subfile)
 S ^XTMP("VELABCOL",0)=$$FMADD^XLFDT(NOW,90)_U_NOW_U_"VistA Evolved Lab Collections"
 N SEQ S SEQ=$O(^XTMP("VELABCOL",DFN,""),-1)+1
 S ^XTMP("VELABCOL",DFN,SEQ)=COLLDT_U_TESTIEN_U_TESTNAME_U_TUBE_U_COLLBY
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="SEQ^"_SEQ
 S RESULT(2)="COLLECTION_DATE^"_COLLDT
 S RESULT(3)="TEST^"_TESTNAME
 S RESULT(4)="TUBE^"_TUBE
 S RESULT(5)="COLLECTED_BY^"_COLLBY
 S RESULT(6)="SOURCE^XTMP_VELABCOL"
 Q
 ;
LABSTAT(RESULT,DFN,ORDERIEN) ;Lab order status query
 ; Returns status of lab orders for a patient
 ;
 N U,I,ORD,ONODE,STATUS,OTEXT,STATNAME
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVELABW Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 ;
 S I=0
 ; If specific order requested
 I $G(ORDERIEN)>0 D  Q
 . I '$D(^OR(100,ORDERIEN,0)) S RESULT(0)="-1^Order not found" Q
 . S ONODE=$G(^OR(100,ORDERIEN,0))
 . S STATUS=$P(ONODE,U,3)
 . S STATNAME=$$ORDSTAT(STATUS)
 . S OTEXT=$P($G(^OR(100,ORDERIEN,3)),U,1)
 . S I=1
 . S RESULT(1)=ORDERIEN_U_STATUS_U_STATNAME_U_OTEXT_U_$P(ONODE,U,7)
 . S RESULT(0)=1
 ;
 ; All lab orders for patient (display group = lab)
 S ORD=0
 F  S ORD=$O(^OR(100,"ACS",DFN,ORD)) Q:'ORD  Q:I>200  D
 . S ONODE=$G(^OR(100,ORD,0))
 . Q:ONODE=""
 . ; Check if this is a lab order (display group in field 12)
 . N DGRP S DGRP=$P(ONODE,U,12)
 . ; Lab display groups vary by site. Check order text for LAB indicators
 . S OTEXT=$P($G(^OR(100,ORD,3)),U,1)
 . I OTEXT="" S OTEXT=$P(ONODE,U,1)
 . ; Filter: include if display group matches lab or order text suggests lab
 . Q:OTEXT'["LAB"&(OTEXT'["CHEM")&(OTEXT'["CBC")&(OTEXT'["BMP")&(OTEXT'["CMP")&(OTEXT'["UA")&(OTEXT'["BLOOD")&(DGRP'=5)
 . S STATUS=$P(ONODE,U,3)
 . S STATNAME=$$ORDSTAT(STATUS)
 . S I=I+1
 . S RESULT(I)=ORD_U_STATUS_U_STATNAME_U_OTEXT_U_$P(ONODE,U,7)
 ;
 S RESULT(0)=I
 Q
 ;
LABHIST(RESULT,DFN,FROMDT,TODT,TESTIEN) ;Patient lab history
 ; Reads lab results from File 63 for a patient
 ;
 N U,I,LRDFN,DT,TIEN,RNODE,TESTNAME
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVELABW Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S FROMDT=$G(FROMDT) I FROMDT="" S FROMDT=$$FMADD^XLFDT($$NOW^XLFDT,-30)
 S TODT=$G(TODT) I TODT="" S TODT=$$NOW^XLFDT
 S TESTIEN=+$G(TESTIEN)
 ;
 S LRDFN=+$G(^DPT(DFN,"LR"))
 I 'LRDFN S RESULT(0)="0^No lab data for patient (no LRDFN)" Q
 ;
 S I=0
 ; Read chemistry results from ^LR(LRDFN,"CH",date,test)
 I $D(^LR(LRDFN,"CH")) D
 . S DT=""
 . F  S DT=$O(^LR(LRDFN,"CH",DT),-1) Q:DT=""  Q:DT<FROMDT  Q:I>500  D
 . . Q:DT>TODT
 . . S TIEN=""
 . . F  S TIEN=$O(^LR(LRDFN,"CH",DT,TIEN)) Q:TIEN=""  D
 . . . I TESTIEN>0,TIEN'=TESTIEN Q  ; filter by specific test
 . . . S RNODE=$G(^LR(LRDFN,"CH",DT,TIEN))
 . . . Q:RNODE=""
 . . . S TESTNAME=$P($G(^LAB(60,TIEN,0)),U,1)
 . . . S I=I+1
 . . . ; Date^TestIEN^TestName^Value^Units^RefRange^AbnFlag^VerifiedBy
 . . . S RESULT(I)=DT_U_TIEN_U_TESTNAME_U_$P(RNODE,U,1)_U_$P(RNODE,U,2)_U_$P(RNODE,U,3)_U_$P(RNODE,U,4)_U_$P(RNODE,U,5)
 ;
 ; Also check ^XTMP("VELABRES") for locally entered results
 I $D(^XTMP("VELABRES",DFN)) D
 . N SEQ,XNODE
 . S SEQ=0
 . F  S SEQ=$O(^XTMP("VELABRES",DFN,SEQ)) Q:'SEQ  D
 . . S XNODE=$G(^XTMP("VELABRES",DFN,SEQ))
 . . Q:XNODE=""
 . . N RECDT S RECDT=$P(XNODE,U,1)
 . . Q:RECDT<FROMDT
 . . Q:RECDT>TODT
 . . S I=I+1
 . . S RESULT(I)=RECDT_U_$P(XNODE,U,2)_U_$P(XNODE,U,3)_U_$P(XNODE,U,4)_U_$P(XNODE,U,5)_U_$P(XNODE,U,6)_U_$P(XNODE,U,7)_U_$P(XNODE,U,8)
 ;
 S RESULT(0)=I
 Q
 ;
ORDSTAT(S) ;Translate File 100 order status code to text
 I S=1 Q "DISCONTINUED"
 I S=2 Q "COMPLETE"
 I S=3 Q "HOLD"
 I S=4 Q "FLAGGED"
 I S=5 Q "PENDING"
 I S=6 Q "ACTIVE"
 I S=7 Q "EXPIRED"
 I S=8 Q "SCHEDULED"
 I S=9 Q "PARTIAL RESULTS"
 I S=10 Q "DELAYED"
 I S=11 Q "UNRELEASED"
 I S=12 Q "DC/EDIT"
 I S=13 Q "CANCELLED"
 I S=14 Q "LAPSED"
 I S=15 Q "RENEWED"
 Q "UNKNOWN("_S_")"
 ;
INSTALL ;Register RPCs in File #8994
 W !,"=== ZVELABW RPC Installer ==="
 D REG^ZVEUSER("VE LAB ORDER","LABORD","ZVELABW")
 D REG^ZVEUSER("VE LAB VERIFY","LABVER","ZVELABW")
 D REG^ZVEUSER("VE LAB RESULT","LABRES","ZVELABW")
 D REG^ZVEUSER("VE LAB COLLECT","LABCOLL","ZVELABW")
 D REG^ZVEUSER("VE LAB STATUS","LABSTAT","ZVELABW")
 D REG^ZVEUSER("VE LAB HISTORY","LABHIST","ZVELABW")
 W "ZVELABW RPCs registered (6 RPCs)",!
 Q
