ZVECHK7 ;VistA-Evolved -- Find auth routines in VEHU ;2026
 ;
CHECK ;
 N U S U="^"
 ; Check what routines exist for XUS
 W "=== XUS Routine Check ===",!
 N R
 F R="XUSRB1","XUSRB","XUSRB2","XUSRB3","XUS","XUS1","XUS2","XUSRB4","XUSBSE","XUSBSE1","XUSRB1A" D
 . W R,": "
 . N LINE S LINE=$T(+1^@R)
 . I LINE'="" W "EXISTS (",LINE,")",!
 . E  W "NOT FOUND",!
 ;
 ; Check the actual RPC DB entry for XUS AV CODE more carefully
 W !,"=== Full RPC entry for IEN 12 ===",!
 N I S I=12
 W "0: ",$G(^XWB(8994,I,0)),!
 W ".1: ",$G(^XWB(8994,I,.1)),!
 W ".2: ",$G(^XWB(8994,I,.2)),!
 W ".3: ",$G(^XWB(8994,I,.3)),!
 W "1: ",$G(^XWB(8994,I,1)),!
 W "2: ",$G(^XWB(8994,I,2)),!
 ; Check IEN 10 (XUS SIGNON SETUP)
 W !,"=== Full RPC entry for IEN 10 ===",!
 S I=10
 W "0: ",$G(^XWB(8994,I,0)),!
 W ".1: ",$G(^XWB(8994,I,.1)),!
 W ".2: ",$G(^XWB(8994,I,.2)),!
 ; Try to find what routine the broker calls
 ; Check XWBBRK or XWBBRK2
 F R="XWBBRK","XWBBRK2","XWBTCPC","XWBTCPM","XWBTCPL","XWBZ" D
 . W R,": "
 . N LINE S LINE=$T(+1^@R)
 . I LINE'="" W "EXISTS",!
 . E  W "NOT FOUND",!
 ; Check the XWB REMOTE PROCEDURE file more thoroughly
 ; Look at how the broker finds the AV CODE handler
 W !,"=== B-xref for XUS RPCs ===",!
 N K S K="XUS"
 F  S K=$O(^XWB(8994,"B",K)) Q:K=""  Q:$E(K,1,3)'="XUS"  D
 . N IEN S IEN=""
 . F  S IEN=$O(^XWB(8994,"B",K,IEN)) Q:IEN=""  D
 . . W K," (IEN ",IEN,")",!
 . . W "  TAG=",$G(^XWB(8994,IEN,.1))," RTN=",$G(^XWB(8994,IEN,.2)),!
 Q
