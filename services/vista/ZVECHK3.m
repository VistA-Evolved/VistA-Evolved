ZVECHK3 ;VistA-Evolved -- Check multiple users + divisions ;2026
 ;
CHECK ;
 N U S U="^"
 ; Check DUZ=1 and DUZ=87
 D SHOWUSR(1),SHOWUSR(5),SHOWUSR(87)
 ; Check institution file
 W !,"=== Institution File 4 ===",!
 N I,CT S I=0,CT=0
 F  S I=$O(^DIC(4,I)) Q:I=""  Q:CT>4  D
 . N N0 S N0=$G(^DIC(4,I,0))
 . Q:N0=""
 . S CT=CT+1
 . W "IEN=",I," NAME=",$P(N0,U,1)," STATION=",$P(N0,U,99),!
 . W "  NODE 99: ",$G(^DIC(4,I,99)),!
 ; Check XWB RPC entries
 W !,"=== XWB File 8994 ===",!
 W "XUS SIGNON SETUP: "
 N X S X="" F  S X=$O(^XWB(8994,"B","XUS SIGNON SETUP",X)) Q:X=""  W X," "
 W !
 W "XUS AV CODE: "
 S X="" F  S X=$O(^XWB(8994,"B","XUS AV CODE",X)) Q:X=""  W X," "
 W !
 Q
 ;
SHOWUSR(XDUZ) ;
 W !,"=== DUZ=",XDUZ," ===",!
 N N0 S N0=$G(^VA(200,XDUZ,0))
 W "NAME: ",$P(N0,U,1),!
 W "NODE .1: ",$G(^VA(200,XDUZ,.1)),!
 W "NODE 7: ",$G(^VA(200,XDUZ,7)),!
 W "DIVISION(0): ",$G(^VA(200,XDUZ,"DIVISION",0)),!
 N J S J=0
 F  S J=$O(^VA(200,XDUZ,"DIVISION",J)) Q:J=""  D
 . W "DIVISION(",J,"): ",$G(^VA(200,XDUZ,"DIVISION",J)),!
 Q
