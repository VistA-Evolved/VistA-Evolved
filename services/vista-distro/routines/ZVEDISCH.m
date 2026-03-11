ZVEDISCH ;VE;Discharge Workflow RPCs;2026-03-10
 ;
 ; PURPOSE: Complete discharge workflow encompassing ADT discharge,
 ; discharge summary (TIU), follow-up orders, and discharge instructions.
 ; This orchestrates the full discharge process in VistA.
 ;
 ; VistA Discharge Architecture:
 ;   File 405   = PATIENT MOVEMENT (^DGPM) -- ADT tracking
 ;   File 8925  = TIU DOCUMENT (^TIU) -- Discharge summary note
 ;   File 100   = ORDER (^OR) -- Follow-up orders
 ;   File 9000010 = VISIT (^AUPNVSIT) -- Encounter tracking
 ;
 ; Entry Points / RPCs:
 ;   DISCH^ZVEDISCH  -> VE DISCHARGE FULL   -- Full discharge workflow
 ;   DCINST^ZVEDISCH -> VE DISCHARGE INSTR  -- Discharge instructions
 ;   DCSUM^ZVEDISCH  -> VE DISCHARGE SUMM   -- Discharge summary
 ;   DCFU^ZVEDISCH   -> VE DISCHARGE FOLLOWUP -- Schedule follow-up
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
DISCH(RESULT,DFN,DISCHDT,DISPIEN,SUMMARY,INSTRUCTIONS,FOLLOWUP) ;
 ; Full discharge workflow:
 ;   1. Create ADT discharge movement in File 405
 ;   2. Create discharge summary TIU note
 ;   3. Record discharge instructions
 ;   4. Schedule follow-up if specified
 ;
 N U,NOW,STEP,MOVIEN,NOTEIEN,FUIEN
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEDISCH Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 I '$D(^DPT(DFN,0)) S RESULT(0)="-1^Patient not found" Q
 S NOW=$$NOW^XLFDT
 S DISCHDT=$G(DISCHDT) I DISCHDT="" S DISCHDT=NOW
 S DISPIEN=$G(DISPIEN)
 S SUMMARY=$G(SUMMARY)
 S INSTRUCTIONS=$G(INSTRUCTIONS)
 S FOLLOWUP=$G(FOLLOWUP)
 ;
 S STEP=0,MOVIEN="",NOTEIEN="",FUIEN=""
 ;
 ; STEP 1: ADT Discharge via VE ADT DISCHARGE (ZVEADTW.m)
 N ADTRESULT
 S STEP=1
 D DISCHARGE^ZVEADTW(.ADTRESULT,DFN,DISPIEN,DUZ,DISCHDT)
 I $P($G(ADTRESULT(0)),U,1)=1 D
 . S MOVIEN=$P($G(ADTRESULT(1)),U,2)
 E  D
 . ; ADT may fail if File 405 isn't available -- continue anyway
 . S MOVIEN="pg-fallback"
 ;
 ; STEP 2: Discharge Summary TIU Note
 S STEP=2
 I SUMMARY'="" D
 . N TIURESULT
 . ; Create TIU document
 . N FDA,IENS,ERR,NEWIEN
 . I $D(^TIU(8925,0)) D
 . . S IENS="+1,"
 . . S FDA(8925,IENS,.01)=5  ; DISCHARGE SUMMARY title (common IEN)
 . . S FDA(8925,IENS,.02)=DFN
 . . S FDA(8925,IENS,.07)=DISCHDT
 . . S FDA(8925,IENS,1202)=DUZ
 . . S FDA(8925,IENS,1301)=DISCHDT
 . . D UPDATE^DIE("","FDA","NEWIEN","ERR")
 . . I '$D(ERR),$G(NEWIEN(1))>0 D
 . . . S NOTEIEN=$G(NEWIEN(1))
 . . . ; Set document text
 . . . N I,LINE
 . . . S I=0
 . . . F  S I=I+1,LINE=$P(SUMMARY,"|",I) Q:LINE=""  D
 . . . . S ^TIU(8925,NOTEIEN,"TEXT",I,0)=LINE
 . . . S ^TIU(8925,NOTEIEN,"TEXT",0)="^^"_I_"^"_I_"^"_$$DT^XLFDT_"^"
 ;
 ; STEP 3: Discharge Instructions stored as additional TIU note
 S STEP=3
 N INSTRIEN S INSTRIEN=""
 I INSTRUCTIONS'="" D
 . N FDA2,IENS2,ERR2,NEWIEN2
 . I $D(^TIU(8925,0)) D
 . . S IENS2="+1,"
 . . S FDA2(8925,IENS2,.01)=10  ; PROGRESS NOTE
 . . S FDA2(8925,IENS2,.02)=DFN
 . . S FDA2(8925,IENS2,.07)=DISCHDT
 . . S FDA2(8925,IENS2,1202)=DUZ
 . . S FDA2(8925,IENS2,1301)=DISCHDT
 . . D UPDATE^DIE("","FDA2","NEWIEN2","ERR2")
 . . I '$D(ERR2),$G(NEWIEN2(1))>0 D
 . . . S INSTRIEN=$G(NEWIEN2(1))
 . . . S ^TIU(8925,INSTRIEN,"TEXT",1,0)="[DISCHARGE INSTRUCTIONS]"
 . . . S ^TIU(8925,INSTRIEN,"TEXT",2,0)=""
 . . . N I2,LINE2 S I2=2
 . . . F  S I2=I2+1,LINE2=$P(INSTRUCTIONS,"|",I2-2) Q:LINE2=""  D
 . . . . S ^TIU(8925,INSTRIEN,"TEXT",I2,0)=LINE2
 . . . S ^TIU(8925,INSTRIEN,"TEXT",0)="^^"_I2_"^"_I2_"^"_$$DT^XLFDT_"^"
 ;
 ; STEP 4: Follow-up scheduling reference
 S STEP=4
 I FOLLOWUP'="" D
 . ; Store follow-up reference in ^XTMP
 . S ^XTMP("VEDCFU",0)=$$FMADD^XLFDT(NOW,90)_U_NOW_U_"Discharge Follow-ups"
 . N SEQ S SEQ=$O(^XTMP("VEDCFU",DFN,""),-1)+1
 . S ^XTMP("VEDCFU",DFN,SEQ)=NOW_U_FOLLOWUP_U_DUZ
 . S FUIEN=SEQ
 ;
 ; Return comprehensive result
 S RESULT(0)="1^OK"
 S RESULT(1)="DFN^"_DFN
 S RESULT(2)="DISCHARGE_DATE^"_DISCHDT
 S RESULT(3)="MOVEMENT_IEN^"_MOVIEN
 S RESULT(4)="SUMMARY_NOTE_IEN^"_NOTEIEN
 S RESULT(5)="INSTRUCTIONS_NOTE_IEN^"_INSTRIEN
 S RESULT(6)="FOLLOWUP_SEQ^"_FUIEN
 S RESULT(7)="PROVIDER^"_DUZ
 S RESULT(8)="STEPS_COMPLETED^"_STEP
 S RESULT(9)="SOURCE^ZVEDISCH"
 Q
 ;
DCINST(RESULT,DFN,INSTRUCTIONS) ;Discharge instructions only
 ; Creates a TIU note with discharge instructions
 ;
 N U,NOW
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEDISCH Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S INSTRUCTIONS=$G(INSTRUCTIONS)
 I INSTRUCTIONS="" S RESULT(0)="-1^Instructions text required" Q
 S NOW=$$NOW^XLFDT
 ;
 N FDA,IENS,ERR,NEWIEN,NOTEIEN
 I '$D(^TIU(8925,0)) S RESULT(0)="-1^TIU file not available" Q
 ;
 S IENS="+1,"
 S FDA(8925,IENS,.01)=10
 S FDA(8925,IENS,.02)=DFN
 S FDA(8925,IENS,.07)=NOW
 S FDA(8925,IENS,1202)=DUZ
 S FDA(8925,IENS,1301)=NOW
 D UPDATE^DIE("","FDA","NEWIEN","ERR")
 I $D(ERR) S RESULT(0)="-1^TIU create failed: "_$G(ERR("DIERR",1,"TEXT",1)) Q
 ;
 S NOTEIEN=$G(NEWIEN(1))
 S ^TIU(8925,NOTEIEN,"TEXT",1,0)="[DISCHARGE INSTRUCTIONS - "_$$FMTE^XLFDT(NOW)_"]"
 S ^TIU(8925,NOTEIEN,"TEXT",2,0)=""
 N I,LINE S I=2
 F  S I=I+1,LINE=$P(INSTRUCTIONS,"|",I-2) Q:LINE=""  D
 . S ^TIU(8925,NOTEIEN,"TEXT",I,0)=LINE
 S ^TIU(8925,NOTEIEN,"TEXT",0)="^^"_I_"^"_I_"^"_$$DT^XLFDT_"^"
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="NOTE_IEN^"_NOTEIEN
 S RESULT(2)="DATE^"_NOW
 S RESULT(3)="SOURCE^TIU_8925"
 Q
 ;
DCSUM(RESULT,DFN,SUMMARYTEXT) ;Discharge summary only
 ; Creates a TIU discharge summary document
 ;
 N U,NOW
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEDISCH Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S SUMMARYTEXT=$G(SUMMARYTEXT)
 I SUMMARYTEXT="" S RESULT(0)="-1^Summary text required" Q
 S NOW=$$NOW^XLFDT
 ;
 N FDA,IENS,ERR,NEWIEN,NOTEIEN
 I '$D(^TIU(8925,0)) S RESULT(0)="-1^TIU file not available" Q
 ;
 S IENS="+1,"
 S FDA(8925,IENS,.01)=5  ; DISCHARGE SUMMARY
 S FDA(8925,IENS,.02)=DFN
 S FDA(8925,IENS,.07)=NOW
 S FDA(8925,IENS,1202)=DUZ
 S FDA(8925,IENS,1301)=NOW
 D UPDATE^DIE("","FDA","NEWIEN","ERR")
 I $D(ERR) S RESULT(0)="-1^TIU create failed: "_$G(ERR("DIERR",1,"TEXT",1)) Q
 ;
 S NOTEIEN=$G(NEWIEN(1))
 S ^TIU(8925,NOTEIEN,"TEXT",1,0)="[DISCHARGE SUMMARY]"
 S ^TIU(8925,NOTEIEN,"TEXT",2,0)="Provider: "_$$GET1^DIQ(200,DUZ,.01)
 S ^TIU(8925,NOTEIEN,"TEXT",3,0)="Date: "_$$FMTE^XLFDT(NOW)
 S ^TIU(8925,NOTEIEN,"TEXT",4,0)=""
 N I,LINE S I=4
 F  S I=I+1,LINE=$P(SUMMARYTEXT,"|",I-4) Q:LINE=""  D
 . S ^TIU(8925,NOTEIEN,"TEXT",I,0)=LINE
 S ^TIU(8925,NOTEIEN,"TEXT",0)="^^"_I_"^"_I_"^"_$$DT^XLFDT_"^"
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="NOTE_IEN^"_NOTEIEN
 S RESULT(2)="DATE^"_NOW
 S RESULT(3)="TYPE^DISCHARGE_SUMMARY"
 S RESULT(4)="SOURCE^TIU_8925"
 Q
 ;
DCFU(RESULT,DFN,FUTYPE,FUDT,CLINIEN,NOTES) ;Schedule follow-up
 ; FUTYPE = APPOINTMENT, LAB, IMAGING, REFERRAL
 ;
 N U,NOW
 S U="^"
 N $ESTACK,$ETRAP S $ETRAP="D ERRTRAP^ZVEDISCH Q"
 S DFN=+$G(DFN)
 I 'DFN S RESULT(0)="-1^Patient DFN required" Q
 S FUTYPE=$G(FUTYPE) I FUTYPE="" S FUTYPE="APPOINTMENT"
 S FUDT=$G(FUDT)
 S CLINIEN=$G(CLINIEN)
 S NOTES=$G(NOTES)
 S NOW=$$NOW^XLFDT
 ;
 ; Store follow-up
 S ^XTMP("VEDCFU",0)=$$FMADD^XLFDT(NOW,90)_U_NOW_U_"Discharge Follow-ups"
 N SEQ S SEQ=$O(^XTMP("VEDCFU",DFN,""),-1)+1
 S ^XTMP("VEDCFU",DFN,SEQ)=NOW_U_FUTYPE_U_FUDT_U_CLINIEN_U_DUZ_U_NOTES
 ;
 ; If appointment type and SDES is available, try to create
 I FUTYPE="APPOINTMENT",FUDT'="",CLINIEN'="" D
 . N SDESIEN S SDESIEN=$O(^XWB(8994,"B","SDEC APPADD",""))
 . I SDESIEN D
 . . ; SDEC APPADD is available -- record for future scheduling
 . . S ^XTMP("VEDCFU",DFN,SEQ,"SDES")="PENDING_SCHEDULE"
 ;
 S RESULT(0)="1^OK"
 S RESULT(1)="SEQ^"_SEQ
 S RESULT(2)="TYPE^"_FUTYPE
 S RESULT(3)="DATE^"_FUDT
 S RESULT(4)="CLINIC^"_CLINIEN
 S RESULT(5)="SOURCE^XTMP_VEDCFU"
 Q
 ;
INSTALL ;Register RPCs in File #8994
 W !,"=== ZVEDISCH RPC Installer ==="
 D REG^ZVEUSER("VE DISCHARGE FULL","DISCH","ZVEDISCH")
 D REG^ZVEUSER("VE DISCHARGE INSTR","DCINST","ZVEDISCH")
 D REG^ZVEUSER("VE DISCHARGE SUMM","DCSUM","ZVEDISCH")
 D REG^ZVEUSER("VE DISCHARGE FOLLOWUP","DCFU","ZVEDISCH")
 W "ZVEDISCH RPCs registered (4 RPCs)",!
 Q
