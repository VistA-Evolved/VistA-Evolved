ZVESCHD3 ; VistA-Evolved Scheduling Source Probe ;2026-02-25
 ;;1.0;VistA-Evolved;**131**;2026-02-25;
 Q
 ;
EN ;
 S U="^"
 W "=== ORWPT APPTLST source ===",!
 N L,I S I=0
 F  S L=$T(APPTLST+I^ORWPT) Q:L=""  S I=I+1 Q:I>30  W I,": ",L,!
 ;
 W !,"=== ORWPT16 APPTLST source ===",!
 S I=0
 F  S L=$T(APPTLST+I^ORWPT16) Q:L=""  S I=I+1 Q:I>30  W I,": ",L,!
 ;
 W !,"=== SDVWAPP MKPI source ===",!
 S I=0
 F  S L=$T(MKPI+I^SDVWAPP) Q:L=""  S I=I+1 Q:I>50  W I,": ",L,!
 ;
 ; Try calling ORWPT APPTLST with DFN 3
 W !,"=== Live call: ORWPT APPTLST (DFN=3) ===",!
 N RES K RES
 D APPTLST^ORWPT(.RES,3)
 N K S K=""
 F  S K=$O(RES(K)) Q:K=""  W "RES(",K,")=",RES(K),!
 ;
 W !,"=== Live call: ORWPT16 APPTLST (DFN=3) ===",!
 K RES
 D APPTLST^ORWPT16(.RES,3)
 S K=""
 F  S K=$O(RES(K)) Q:K=""  W "RES(",K,")=",RES(K),!
 ;
 ; Try SDOE LIST ENCOUNTERS FOR PAT with DFN 3
 W !,"=== SDOE LIST ENCOUNTERS FOR PAT (DFN=3) ===",!
 K RES
 D LISTPAT^SDOERPC(.RES,3)
 S K=""
 F  S K=$O(RES(K)) Q:K=""  W "RES(",K,")=",RES(K),!
 ;
 ; Try W/L reference data
 W !,"=== SD W/L PRIORITY(#409.3) ===",!
 K RES
 D SDPRIOUT^SDWLRP3(.RES,"")
 S K=""
 F  S K=$O(RES(K)) Q:K=""  W "RES(",K,")=",RES(K),!
 ;
 W !,"=== SD W/L TYPE(409.3) ===",!
 K RES
 D SDTYOUT^SDWLRP3(.RES,"")
 S K=""
 F  S K=$O(RES(K)) Q:K=""  W "RES(",K,")=",RES(K),!
 ;
 W !,"=== SD W/L CURRENT STATUS(409.3) ===",!
 K RES
 D SDSTOUT^SDWLRP3(.RES,"")
 S K=""
 F  S K=$O(RES(K)) Q:K=""  W "RES(",K,")=",RES(K),!
 ;
 ; Try clinic list ^SC
 W !,"=== Full ^SC clinic list ===",!
 N HI,HC,HNAME S HI=0,HC=0
 F  S HI=$O(^SC(HI)) Q:HI'>0  D
 . S HNAME=$P($G(^SC(HI,0)),U,1)
 . Q:HNAME=""
 . S HC=HC+1
 . W HC,": IEN=",HI," NAME=",HNAME
 . W " TYPE=",$P($G(^SC(HI,0)),U,3)
 . W " ABBR=",$P($G(^SC(HI,0)),U,2),!
 W "Total clinics: ",HC,!
 ;
 W !,"=== Probe complete ===",!
 Q
