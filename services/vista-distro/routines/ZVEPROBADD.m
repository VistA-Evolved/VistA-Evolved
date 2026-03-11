ZVEPROBADD ; VistA-Evolved problem add wrapper ;2026-03-08
 ;;1.0;VistA-Evolved Problem Add;
 ;
 ; VE PROBLEM ADD -- Add a problem using native GMPL utilities.
 ;
 ; Input:
 ;   RESULT  (by reference)
 ;   DFN     Patient DFN
 ;   TERM    Problem text / lexicon description
 ;   LEXIEN  Lexicon IEN from ORQQPL4 LEX
 ;   ONSET   Optional date: FM, FM^external, or ISO YYYY-MM-DD
 ;   STATUS  Optional A/I or ACTIVE/INACTIVE (default A)
 ;   CLINIEN Optional clinic IEN (defaults to GENERAL MEDICINE when present)
 ;
 ; Output:
 ;   RESULT(0)=1^<problem IEN>^Problem added
 ;   RESULT(0)=0^<message> on failure
 ;
 ; Safety:
 ;   - Uses DUZ / DUZ(2) from the authenticated broker session.
 ;   - Delegates filing to NEW^GMPLSAVE.
 ;   - Does not KILL or rewrite unrelated globals.
 ;
ADD(RESULT,DFN,TERM,LEXIEN,ONSET,STATUS,CLINIEN) ; RPC: VE PROBLEM ADD
 N GMPDFN,GMPROV,GMPVAMC,GMPFLD,PT,ONSETFM,ONSETEXT,DATESTR,NARR,PROVNM,CLINNM
 N SC,AO,IR,EC,SAVEIEN,LEXPTR,NOS,STAT
 S U="^"
 K RESULT
 S RESULT(0)="0^Unknown error"
 ;
 S GMPDFN=+$G(DFN)
 S GMPROV=+$G(DUZ)
 S GMPVAMC=+$G(DUZ(2))
 S TERM=$$TRIM($G(TERM))
 S LEXPTR=+$G(LEXIEN)
 ;
 I GMPDFN<1 S RESULT(0)="0^Patient DFN is required" Q
 I GMPROV<1 S RESULT(0)="0^Authenticated provider DUZ is required" Q
 I GMPVAMC<1 S RESULT(0)="0^Authenticated division/facility is required" Q
 I TERM="" S RESULT(0)="0^Problem term is required" Q
 I LEXPTR<1 S RESULT(0)="0^Lexicon IEN is required" Q
 ;
 S DATESTR=$$FMONSET($G(ONSET))
 S ONSETFM=+$P(DATESTR,U)
 S ONSETEXT=$P(DATESTR,U,2)
 I ONSETFM<1 S RESULT(0)="0^Unable to resolve onset date" Q
 ;
 S NARR=$$PROVNARR^GMPLX(TERM,LEXPTR)
 I +NARR<1 S RESULT(0)="0^Unable to resolve provider narrative" Q
 ;
 D INITPT^ORQQPL1(.PT,GMPDFN)
 S SC=$S(+$G(PT(2))>0:"1^YES",1:"0^NO")
 S AO=+$G(PT(3))_"^AGENT ORANGE"
 S IR=+$G(PT(4))_"^RADIATION"
 S EC=+$G(PT(5))_"^ENV CONTAMINANTS"
 S STAT=$$NORMSTAT($G(STATUS))
 S NOS=$$NOS^GMPLX("10D",ONSETFM)
 S PROVNM=$P($G(^VA(200,GMPROV,0)),U,1)
 D RESCLIN(.CLINIEN,.CLINNM)
 ;
 S GMPFLD(.01)=NOS
 S GMPFLD(.05)=+NARR_U_TERM
 S GMPFLD(.12)=STAT
 S GMPFLD(.13)=ONSETFM_U_ONSETEXT
 S GMPFLD(1.01)=LEXPTR_U_TERM
 S GMPFLD(1.02)="P"
 S GMPFLD(1.05)=GMPROV_U_PROVNM
 I +$G(CLINIEN)>0 S GMPFLD(1.08)=+CLINIEN_U_CLINNM
 S GMPFLD(1.09)=ONSETFM_U_ONSETEXT
 S GMPFLD(1.1)=SC
 S GMPFLD(1.11)=AO
 S GMPFLD(1.12)=IR
 S GMPFLD(1.13)=EC
 S GMPFLD(1.14)="C^CHRONIC"
 S GMPFLD(10,0)="0^"
 S GMPFLD(80201)=ONSETFM_U_ONSETEXT
 S GMPFLD(80202)="10D^ICD-10-CM"
 ;
 D NEW^GMPLSAVE
 S SAVEIEN=+$G(DA)
 I SAVEIEN>0 S RESULT(0)="1^"_SAVEIEN_"^Problem added" Q
 S RESULT(0)="0^GMPLSAVE did not return a problem IEN"
 Q
 ;
FMONSET(VALUE) ; Return <fm>^<external>
 N RAW,Y,%DT
 S RAW=$$TRIM($G(VALUE))
 I RAW="" S RAW=$$DT^XLFDT()
 I RAW["^" Q RAW
 I RAW?7N Q RAW_U_$$FMTE^XLFDT(RAW,"5Z")
 I RAW?8N Q $E(RAW,2,8)_U_$$FMTE^XLFDT($E(RAW,2,8),"5Z")
 I RAW?4N1"-"2N1"-"2N D  Q Y_U_$$FMTE^XLFDT(Y,"5Z")
 . S %DT="X",X=$E(RAW,6,7)_"/"_$E(RAW,9,10)_"/"_$E(RAW,1,4) D ^%DT
 S %DT="X",X=RAW D ^%DT
 I Y<1 Q ""
 Q Y_U_$$FMTE^XLFDT(Y,"5Z")
 ;
NORMSTAT(VALUE) ; Return A^ACTIVE or I^INACTIVE
 N RAW
 S RAW=$$UP^XLFSTR($$TRIM($G(VALUE)))
 I RAW="I"!(RAW="INACTIVE") Q "I^INACTIVE"
 Q "A^ACTIVE"
 ;
RESCLIN(CLINIEN,CLINNM) ; Resolve clinic metadata
 N TMP
 S CLINIEN=+$G(CLINIEN)
 I CLINIEN>0,$D(^SC(CLINIEN,0)) S CLINNM=$P($G(^SC(CLINIEN,0)),U,1) Q
 S CLINIEN=+$O(^SC("B","GENERAL MEDICINE",0))
 I CLINIEN>0 S CLINNM=$P($G(^SC(CLINIEN,0)),U,1) Q
 S CLINNM=""
 Q
 ;
TRIM(X) ; Simple trim
 N Y
 S Y=$G(X)
 F  Q:$E(Y,1)'=" "  S Y=$E(Y,2,$L(Y))
 F  Q:$E(Y,$L(Y))'=" "  S Y=$E(Y,1,$L(Y)-1)
 Q Y
 ;
INSTALL ; Install VE PROBLEM ADD RPC into File 8994
 N IEN,FOUND,MAXIEN,NAME
 S U="^"
 S NAME="VE PROBLEM ADD"
 S FOUND=0,IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D  Q:FOUND>0
 . I $P($G(^XWB(8994,IEN,0)),U,1)=NAME S FOUND=IEN
 I FOUND>0 D  Q
 . S ^XWB(8994,"B",NAME,FOUND)=""
 . W !,NAME_" already registered at IEN "_FOUND
 S MAXIEN=0,IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  I IEN>MAXIEN S MAXIEN=IEN
 S IEN=MAXIEN+1
 S ^XWB(8994,IEN,0)=NAME_"^ADD^ZVEPROBADD^2^^0^^0"
 S ^XWB(8994,IEN,.1)="Problem add wrapper using native GMPL utilities (Phase 683)"
 S ^XWB(8994,"B",NAME,IEN)=""
 S ^XWB(8994,0)="REMOTE PROCEDURE^"_IEN_"^"_IEN
 W !,NAME_" registered at IEN "_IEN
 Q
