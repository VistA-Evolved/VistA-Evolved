ZVESCHD5 ; VistA-Evolved Scheduling Ref Data Probe (fixed) ;2026-02-25
 ;;1.0;VistA-Evolved;**131**;2026-02-25;
 Q
 ;
EN ;
 S U="^"
 ;
 ; Check the M source for SDWLRP3 to understand params
 W "=== SDWLRP3 source (first 60 lines) ===",!
 N L,I S I=0
 F  S L=$T(+I^SDWLRP3) Q:L=""  S I=I+1 Q:I>60  W I,": ",L,!
 ;
 W !,"=== SDWLRP1 INPUT source (CREATE FILE) ===",!
 S I=0
 F  S L=$T(INPUT+I^SDWLRP1) Q:L=""  S I=I+1 Q:I>40  W I,": ",L,!
 ;
 W !,"=== SDWLRP1 OUTPUT source (RETRIVE FULL DATA) ===",!
 S I=0
 F  S L=$T(OUTPUT+I^SDWLRP1) Q:L=""  S I=I+1 Q:I>40  W I,": ",L,!
 ;
 ; File 44 - full clinic list
 W !,"=== Full ^SC (File 44) ===",!
 N HI,HC S HI=0,HC=0
 F  S HI=$O(^SC(HI)) Q:HI'>0  D
 . N HNAME S HNAME=$P($G(^SC(HI,0)),U,1)
 . Q:HNAME=""
 . S HC=HC+1
 . W HC,": IEN=",HI," ",HNAME,!
 W "Total: ",HC,!
 ;
 ; ORWPT APPTLST for various DFNs
 W !,"=== ORWPT APPTLST for DFNs ===",!
 N DFN2
 F DFN2=1,2,3,4,5,25,87,100 D
 . N RES K RES
 . D APPTLST^ORWPT(.RES,DFN2)
 . N CT,K2 S CT=0,K2=""
 . F  S K2=$O(RES(K2)) Q:K2=""  S CT=CT+1
 . W "DFN=",DFN2," -> ",CT," appt(s)",!
 . I CT>0 S K2="" F  S K2=$O(RES(K2)) Q:K2=""  W "  ",K2,"=",RES(K2),!
 ;
 W !,"=== Done ===",!
 Q
