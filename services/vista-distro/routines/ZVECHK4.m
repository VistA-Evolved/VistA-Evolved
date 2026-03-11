ZVECHK4 ;VistA-Evolved -- Find station number + fix divisions ;2026
 ;
CHECK ;
 N U S U="^"
 ; Check Kernel System Parameters (file 8989.3)
 W "=== Kernel System Parameters ===",!
 N I S I=0
 F  S I=$O(^XTV(8989.3,I)) Q:I=""  D
 . W "KSP IEN=",I,!
 . W "  NODE 0: ",$G(^XTV(8989.3,I,0)),!
 . W "  NODE 1: ",$E($G(^XTV(8989.3,I,1)),1,80),!
 ; Check ^DIC(4 for station numbers more carefully
 W !,"=== All Institutions ===",!
 N I,CT S I=0,CT=0
 F  S I=$O(^DIC(4,I)) Q:I=""  Q:CT>19  D
 . N N0 S N0=$G(^DIC(4,I,0))
 . Q:N0=""
 . S CT=CT+1
 . W "IEN=",I," ",$P(N0,U,1)
 . N N99 S N99=$G(^DIC(4,I,99))
 . I N99'="" W " STA#=",$P(N99,U,1)
 . W !
 ; Check ^DIC(4,"D" xref for station numbers
 W !,"=== Station Number D-xref ===",!
 N K,CT2 S K="",CT2=0
 F  S K=$O(^DIC(4,"D",K)) Q:K=""  Q:CT2>9  D
 . S CT2=CT2+1
 . N J S J=""
 . F  S J=$O(^DIC(4,"D",K,J)) Q:J=""  D
 . . W "STATION ",K," -> IEN ",J,!
 ; Check XUS DIVISION file 200.02
 W !,"=== Current DUZ=1 div setup ===",!
 W "DIV(0)=",$G(^VA(200,1,"DIVISION",0)),!
 W "DIV(1)=",$G(^VA(200,1,"DIVISION",1)),!
 ; List users with access codes who have divisions
 W !,"=== Users WITH divisions ===",!
 N XDUZ,CT3 S XDUZ=0,CT3=0
 F  S XDUZ=$O(^VA(200,XDUZ)) Q:XDUZ=""  Q:CT3>9  D
 . Q:$G(^VA(200,XDUZ,"DIVISION",0))=""
 . N N0D S N0D=$G(^VA(200,XDUZ,"DIVISION",0))
 . Q:+N0D=0
 . S CT3=CT3+1
 . W "DUZ=",XDUZ," ",$P($G(^VA(200,XDUZ,0)),U,1)," DIVS=",N0D,!
 I CT3=0 W "NONE FOUND",!
 Q
