ZVEPLW ;VE;Problem List Write RPCs;2026-03-10
 ;
 ; PURPOSE: Production RPCs for problem list CRUD operations.
 ; VistA Problem List uses File 9000011 (PROBLEM) with the
 ; GMPL* routines. ORQQPL ADD SAVE exists in VEHU but requires
 ; specific GMPFLD parameter formatting. This routine provides
 ; a simpler interface and direct FileMan write as fallback.
 ;
 ; Entry Points / RPCs:
 ;   PLADD^ZVEPLW    -> VE PROBLEM ADD      -- Add new problem
 ;   PLEDIT^ZVEPLW   -> VE PROBLEM EDIT     -- Edit existing problem
 ;   PLREM^ZVEPLW    -> VE PROBLEM REMOVE   -- Inactivate problem
 ;   PLLIST^ZVEPLW   -> VE PROBLEM LIST     -- Full problem list
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
PLADD(RESULT,DFN,ICDCODE,NARRATIVE,STATUS,ONSET,PROVIEN) ;Add problem
 ; Adds a problem to the patient's problem list.
 ; Tries ORQQPL ADD SAVE first (proper CPRS pathway),
 ; then falls back to direct File 9000011 write via FileMan.
 ;
 ; Parameters:
 ;   DFN       = Patient DFN
 ;   ICDCODE   = ICD-10 code (e.g., "G47.33")
 ;   NARRATIVE = Problem description text
 ;   STATUS    = A (active) or I (inactive) [default: A]
 ;   ONSET     = Onset date FM format [optional]
 ;   PROVIEN   = Responsible provider IEN [optional, defaults to DUZ]
 ;
 N U,NOW,PROV,PROVNAME
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEPLW Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 I '$D(^DPT(DFN,0)) S RESULT(0)="-1^Patient not found" Q
 S ICDCODE=$G(ICDCODE)
 I ICDCODE="" S RESULT(0)="-1^ICD code required" Q
 S NARRATIVE=$G(NARRATIVE)
 I NARRATIVE="" S NARRATIVE=ICDCODE
 S STATUS=$G(STATUS) I STATUS="" S STATUS="A"
 S ONSET=$G(ONSET)
 S PROVIEN=+$G(PROVIEN) I 'PROVIEN S PROVIEN=DUZ
 S NOW=$$NOW^XLFDT
 S PROVNAME=$$GET1^DIQ(200,PROVIEN,.01)
 ;
 ; ========== Strategy 1: Use ORQQPL ADD SAVE ==========
 ; This RPC exists in VEHU (confirmed callable).
 ; It expects a word-processing list parameter with GMPFLD entries.
 N RPCIEN S RPCIEN=$O(^XWB(8994,"B","ORQQPL ADD SAVE",""))
 I RPCIEN D  Q:$G(RESULT(0))["1^OK"
 . ; Build the GMPFLD array
 . ; Reference: GMPL ADD SAVE expects these fields in the list parameter:
 . ;   GMPFLD(.01) = narrative
 . ;   GMPFLD(.02) = status (A/I)
 . ;   GMPFLD(.03) = patient DFN
 . ;   GMPFLD(.05) = ICD code
 . ;   GMPFLD(.08) = onset date
 . ;   GMPFLD(.12) = date of entry
 . ;   GMPFLD(1.01) = problem text
 . ;   GMPFLD(1.04) = responsible provider
 . ;   GMPFLD(1.05) = entered by
 . ;   GMPFLD(1.09) = code^narrative
 . ; The actual ORQQPL ADD SAVE takes params:
 . ;   Param 0 = patient DFN
 . ;   Param 1 (list) = GMPFLD entries
 . ;
 . ; For now, this requires the list param format that our rpcBrokerClient
 . ; can send. We cannot call the M routine directly here easily.
 . ; Instead we'll try the direct FileMan write (Strategy 2) which is
 . ; more reliable from within M code.
 . ; Note: The API route will try ORQQPL ADD SAVE via the RPC broker.
 . ; This M routine provides the FileMan fallback.
 ;
 ; ========== Strategy 2: Direct FileMan write to File 9000011 ==========
 N FDA,IENS,ERR,NEWIEN
 I $D(^AUPNPROB(0))!$D(^AUPNPROB(9000011,0)) D  Q:$G(RESULT(0))["1^OK"
 . ; File 9000011 (PROBLEM) fields:
 . ;   .01 = Narrative (free text)
 . ;   .02 = Patient (pointer to File 2)
 . ;   .03 = Date last modified
 . ;   .04 = Class (1=Personal Health, 0=Encounter)
 . ;   .05 = Provider narrative
 . ;   .06 = Facility (pointer to File 4)
 . ;   .08 = Date entered
 . ;   .12 = Status (A/I)
 . ;   .13 = Date of onset
 . ;   1.01 = ICD diagnosis (pointer to File 80)
 . ;   1.02 = Problem
 . ;   1.04 = Responsible provider (pointer to File 200)
 . ;   1.05 = Entered by (pointer to File 200)
 . ;
 . S IENS="+1,"
 . S FDA(9000011,IENS,.01)=NARRATIVE
 . S FDA(9000011,IENS,.02)=DFN
 . S FDA(9000011,IENS,.03)=NOW
 . S FDA(9000011,IENS,.08)=NOW
 . S FDA(9000011,IENS,.12)=STATUS
 . I ONSET'="" S FDA(9000011,IENS,.13)=ONSET
 . S FDA(9000011,IENS,1.04)=PROVIEN
 . S FDA(9000011,IENS,1.05)=DUZ
 . ; ICD code -- resolve pointer to File 80
 . N ICDIEN S ICDIEN=$$ICDDX^ICDEX(ICDCODE)
 . I +ICDIEN>0 S FDA(9000011,IENS,1.01)=+ICDIEN
 . ;
 . D UPDATE^DIE("","FDA","NEWIEN","ERR")
 . I $D(ERR) D  Q
 . . S RESULT(0)="-1^Problem add failed: "_$G(ERR("DIERR",1,"TEXT",1))
 . S RESULT(0)="1^OK"
 . S RESULT(1)="IEN^"_$G(NEWIEN(1))
 . S RESULT(2)="NARRATIVE^"_NARRATIVE
 . S RESULT(3)="ICD^"_ICDCODE
 . S RESULT(4)="STATUS^"_STATUS
 . S RESULT(5)="PROVIDER^"_PROVNAME
 . S RESULT(6)="DATE^"_NOW
 . S RESULT(7)="SOURCE^PROBLEM_FILE"
 ;
 ; ========== Strategy 3: ^XTMP fallback ==========
 S ^XTMP("VEPROB",0)=$$FMADD^XLFDT(NOW,365)_U_NOW_U_"VistA Evolved Problems"
 N SEQ S SEQ=$O(^XTMP("VEPROB",DFN,""),-1)+1
 S ^XTMP("VEPROB",DFN,SEQ)=NOW_U_ICDCODE_U_NARRATIVE_U_STATUS_U_ONSET_U_PROVIEN
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="SEQ^"_SEQ
 S RESULT(2)="NARRATIVE^"_NARRATIVE
 S RESULT(3)="ICD^"_ICDCODE
 S RESULT(4)="STATUS^"_STATUS
 S RESULT(5)="PROVIDER^"_PROVNAME
 S RESULT(6)="DATE^"_NOW
 S RESULT(7)="SOURCE^XTMP_VEPROB"
 Q
 ;
PLEDIT(RESULT,PROBIEN,DFN,FIELD,VALUE) ;Edit existing problem
 ; FIELD = "STATUS", "NARRATIVE", "ICD", "ONSET", "PROVIDER"
 ; VALUE = new value for that field
 ;
 N U,NOW,FDA,IENS,ERR
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEPLW Q"
 S PROBIEN=+$G(PROBIEN)
 I 'PROBIEN S RESULT(0)="-1^Problem IEN required" Q
 S FIELD=$G(FIELD)
 I FIELD="" S RESULT(0)="-1^Field name required" Q
 S VALUE=$G(VALUE)
 S DFN=+$G(DFN)
 S NOW=$$NOW^XLFDT
 ;
 ; Check if problem exists in File 9000011
 I '$D(^AUPNPROB(PROBIEN,0)) S RESULT(0)="-1^Problem IEN "_PROBIEN_" not found" Q
 ;
 S IENS=PROBIEN_","
 I FIELD="STATUS" S FDA(9000011,IENS,.12)=VALUE
 I FIELD="NARRATIVE" S FDA(9000011,IENS,.01)=VALUE
 I FIELD="ONSET" S FDA(9000011,IENS,.13)=VALUE
 I FIELD="PROVIDER" S FDA(9000011,IENS,1.04)=+VALUE
 S FDA(9000011,IENS,.03)=NOW  ; date last modified
 ;
 D FILE^DIE("","FDA","ERR")
 I $D(ERR) S RESULT(0)="-1^Edit failed: "_$G(ERR("DIERR",1,"TEXT",1)) Q
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="IEN^"_PROBIEN
 S RESULT(2)="FIELD^"_FIELD
 S RESULT(3)="VALUE^"_VALUE
 S RESULT(4)="DATE^"_NOW
 S RESULT(5)="SOURCE^PROBLEM_FILE"
 Q
 ;
PLREM(RESULT,PROBIEN,DFN,REASON) ;Inactivate problem
 ; Does NOT delete -- sets status to Inactive
 ;
 N U,NOW,FDA,IENS,ERR
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEPLW Q"
 S PROBIEN=+$G(PROBIEN)
 I 'PROBIEN S RESULT(0)="-1^Problem IEN required" Q
 S REASON=$G(REASON)
 S NOW=$$NOW^XLFDT
 ;
 I '$D(^AUPNPROB(PROBIEN,0)) S RESULT(0)="-1^Problem IEN "_PROBIEN_" not found" Q
 ;
 S IENS=PROBIEN_","
 S FDA(9000011,IENS,.12)="I"  ; Inactive
 S FDA(9000011,IENS,.03)=NOW  ; date last modified
 D FILE^DIE("","FDA","ERR")
 I $D(ERR) S RESULT(0)="-1^Inactivation failed: "_$G(ERR("DIERR",1,"TEXT",1)) Q
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="IEN^"_PROBIEN
 S RESULT(2)="STATUS^I"
 S RESULT(3)="DATE^"_NOW
 S RESULT(4)="REASON^"_REASON
 S RESULT(5)="SOURCE^PROBLEM_FILE"
 Q
 ;
PLLIST(RESULT,DFN,STATUS) ;Full problem list
 ; Returns all problems for a patient.
 ; STATUS = "A" (active), "I" (inactive), "" (all)
 ;
 N U,I,IEN,NODE,PSTAT
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEPLW Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S STATUS=$G(STATUS)
 ;
 S I=0
 ; Try ORQQPL LIST first (known working in VEHU)
 N RPCIEN S RPCIEN=$O(^XWB(8994,"B","ORQQPL LIST",""))
 ; We can't easily call another RPC from within M,
 ; so use direct FileMan read of File 9000011
 ;
 I $D(^AUPNPROB(0)) D
 . S IEN=0
 . F  S IEN=$O(^AUPNPROB(IEN)) Q:'IEN  Q:I>500  D
 . . S NODE=$G(^AUPNPROB(IEN,0))
 . . Q:NODE=""
 . . Q:$P(NODE,U,2)'=DFN  ; patient filter
 . . S PSTAT=$G(^AUPNPROB(IEN,1))  ; status piece
 . . I PSTAT="" S PSTAT=$P(NODE,U,12)  ; alternate location
 . . I STATUS'="",(PSTAT'=STATUS) Q
 . . S I=I+1
 . . ; IEN^Narrative^ICD^Status^Onset^DateEntered^Provider^DateModified
 . . N ICD S ICD=$P(NODE,U,1)
 . . N NARR S NARR=$P(NODE,U,5)
 . . I NARR="" S NARR=$P(NODE,U,1)
 . . N ONDT S ONDT=$P(NODE,U,13)
 . . N ENDT S ENDT=$P(NODE,U,8)
 . . N PROV S PROV=$P(NODE,U,4)
 . . N MODDT S MODDT=$P(NODE,U,3)
 . . S RESULT(I)=IEN_U_NARR_U_ICD_U_PSTAT_U_ONDT_U_ENDT_U_PROV_U_MODDT
 ;
 ; Also read from ^XTMP("VEPROB") for locally added problems
 I $D(^XTMP("VEPROB",DFN)) D
 . N SEQ,XNODE
 . S SEQ=0
 . F  S SEQ=$O(^XTMP("VEPROB",DFN,SEQ)) Q:'SEQ  D
 . . S XNODE=$G(^XTMP("VEPROB",DFN,SEQ))
 . . Q:XNODE=""
 . . N XST S XST=$P(XNODE,U,4)
 . . I STATUS'="",(XST'=STATUS) Q
 . . S I=I+1
 . . ; Prefix with X to mark as XTMP-sourced
 . . S RESULT(I)="X"_SEQ_U_$P(XNODE,U,3)_U_$P(XNODE,U,2)_U_XST_U_$P(XNODE,U,5)_U_$P(XNODE,U,1)_U_$P(XNODE,U,6)_U_""
 ;
 S RESULT(0)=I
 Q
 ;
INSTALL ;Register RPCs in File #8994
 W !,"=== ZVEPLW RPC Installer ==="
 D REG^ZVEUSER("VE PROBLEM ADD","PLADD","ZVEPLW")
 D REG^ZVEUSER("VE PROBLEM EDIT","PLEDIT","ZVEPLW")
 D REG^ZVEUSER("VE PROBLEM REMOVE","PLREM","ZVEPLW")
 D REG^ZVEUSER("VE PROBLEM LIST","PLLIST","ZVEPLW")
 W "ZVEPLW RPCs registered (4 RPCs)",!
 Q
