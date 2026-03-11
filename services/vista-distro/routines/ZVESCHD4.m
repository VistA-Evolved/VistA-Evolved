ZVESCHD4 ; VistA-Evolved Scheduling Reference Data Probe ;2026-02-25
 ;;1.0;VistA-Evolved;**131**;2026-02-25;
 Q
 ;
EN ;
 S U="^"
 ;
 ; W/L reference data RPCs
 W "=== SD W/L PRIORITY(#409.3) ===",!
 N RES K RES
 D SDPRIOUT^SDWLRP3(.RES,"")
 N K S K=""
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
 ; Full File 44 with type filtering for clinics
 W !,"=== File 44 Hospital Locations (type=C clinics) ===",!
 N HI,HC,HNAME,HTYPE S HI=0,HC=0
 F  S HI=$O(^SC(HI)) Q:HI'>0  D
 . S HNAME=$P($G(^SC(HI,0)),U,1)
 . S HTYPE=$P($G(^SC(HI,0)),U,3)
 . Q:HNAME=""
 . S HC=HC+1
 . W HC,": IEN=",HI," NAME=",HNAME," TYPE=",HTYPE
 . W " ABBR=",$P($G(^SC(HI,0)),U,2)
 . W " PHONE=",$P($G(^SC(HI,0)),U,99)
 . W !
 W "Total locations: ",HC,!
 ;
 ; Try ORWPT APPTLST with different DFNs
 W !,"=== ORWPT APPTLST for various DFNs ===",!
 N DFN2
 F DFN2=1,2,3,4,5,25,87,100 D
 . K RES
 . D APPTLST^ORWPT(.RES,DFN2)
 . N CT S CT=0,K=""
 . F  S K=$O(RES(K)) Q:K=""  S CT=CT+1
 . W "DFN=",DFN2," -> ",CT," appointment(s)",!
 . I CT>0 S K="" F  S K=$O(RES(K)) Q:K=""  W "  RES(",K,")=",RES(K),!
 ;
 W !,"=== Probe complete ===",!
 Q
