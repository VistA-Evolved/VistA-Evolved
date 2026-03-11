ZVESCHD ; VistA-Evolved Scheduling RPC Probe ;2026-02-25
 ;;1.0;VistA-Evolved;**131**;2026-02-25;
 ;
 ; Phase 131 - Probe scheduling-related RPCs in sandbox
 ; Scans ^XWB(8994) for SD*, SDES*, SDEC*, SDAM* RPCs
 ;
 Q
 ;
EN ; Main entry
 N IEN,NAME,TAG,RTN,CT
 S U="^"
 W "=== Scheduling RPC Probe (Phase 131) ===",!
 W !,"--- SD/SDES/SDEC/SDAM RPCs in ^XWB(8994) ---",!
 S IEN=0,CT=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D
 . S NAME=$P($G(^XWB(8994,IEN,0)),U,1)
 . Q:NAME=""
 . I NAME'?1"SD".E,NAME'?1"SDES".E,NAME'?1"SDEC".E,NAME'?1"SDAM".E Q
 . S TAG=$P($G(^XWB(8994,IEN,0)),U,2)
 . S RTN=$P($G(^XWB(8994,IEN,0)),U,3)
 . S CT=CT+1
 . W CT,": IEN=",IEN," NAME=",NAME
 . W " TAG=",TAG," RTN=",RTN,!
 W !,"Total SD/SDES/SDEC/SDAM RPCs: ",CT,!
 ;
 ; Also check SC* (scheduling context) and appointment-related entries
 W !,"--- SC/APPOINTMENT RPCs ---",!
 S IEN=0,CT=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D
 . S NAME=$P($G(^XWB(8994,IEN,0)),U,1)
 . Q:NAME=""
 . I NAME'?1"SC ".E,NAME'["APPOINTMENT",NAME'["APPT" Q
 . S TAG=$P($G(^XWB(8994,IEN,0)),U,2)
 . S RTN=$P($G(^XWB(8994,IEN,0)),U,3)
 . S CT=CT+1
 . W CT,": IEN=",IEN," NAME=",NAME
 . W " TAG=",TAG," RTN=",RTN,!
 W !,"Total SC/APPT RPCs: ",CT,!
 ;
 ; Check for clinic-related globals
 W !,"--- Hospital Location (File 44) sample ---",!
 N HI,HC S HI=0,HC=0
 F  S HI=$O(^SC(HI)) Q:HI'>0  Q:HC>10  D
 . S HC=HC+1
 . W HC,": IEN=",HI," NAME=",$P($G(^SC(HI,0)),U,1),!
 W "Total entries in ^SC: ",$O(^SC(""),-1),!
 ;
 ; Check SDEC globals
 W !,"--- SDEC Globals check ---",!
 W "^SDEC(409.84): ",$S($D(^SDEC(409.84)):"EXISTS",1:"NOT FOUND"),!
 W "^SDEC(409.832): ",$S($D(^SDEC(409.832)):"EXISTS",1:"NOT FOUND"),!
 W "^SDEC(409.831): ",$S($D(^SDEC(409.831)):"EXISTS",1:"NOT FOUND"),!
 W "^SD(409.3): ",$S($D(^SD(409.3)):"EXISTS",1:"NOT FOUND"),!
 W "^SDEC: ",$S($D(^SDEC):"EXISTS",1:"NOT FOUND"),!
 ;
 ; Check SD WAIT LIST
 W !,"--- SD Wait List (File 409.3) sample ---",!
 N WI,WC S WI=0,WC=0
 F  S WI=$O(^SD(409.3,WI)) Q:WI'>0  Q:WC>5  D
 . S WC=WC+1
 . W WC,": IEN=",WI," DATA=",$G(^SD(409.3,WI,0)),!
 W "SD Wait List entries: ",WC,!
 ;
 ; Check existing SDOE files
 W !,"--- SDOE (File 409.68) check ---",!
 W "^AUPNVSIT: ",$S($D(^AUPNVSIT):"EXISTS",1:"NOT FOUND"),!
 W "Sample visit: ",$P($G(^AUPNVSIT(1,0)),U,1),!
 ;
 W !,"=== Probe complete ===",!
 Q
