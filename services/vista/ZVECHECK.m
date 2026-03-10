ZVECHECK ;VistA-Evolved -- Check user DUZ=1 access status ;2026-03-09
 ;
CHECK ;
 N DUZ,X,Y,NAME,DISUSER,VERIFYCHG,U
 S U="^"
 S DUZ=1
 S NAME=$P($G(^VA(200,DUZ,0)),U,1)
 W "USER: ",NAME,!
 S DISUSER=$P($G(^VA(200,DUZ,7)),U,4)
 W "DISUSER FLAG: ",DISUSER,!
 S VERIFYCHG=$P($G(^VA(200,DUZ,.1)),U,2)
 W "VERIFY CODE CHANGED: ",VERIFYCHG,!
 ; Check if access code exists
 W "ACCESS NODE: ",$E($G(^VA(200,DUZ,.1)),1,20),"...",!
 ; Check termination
 S X=$P($G(^VA(200,DUZ,"DISYS")),U,1)
 W "DISYS (terminated): ",X,!
 ; Check for DT (date/time restrictions)
 W "NODE 3: ",$G(^VA(200,DUZ,3)),!
 ; List first 5 users with access codes
 W !,"--- First 5 users with access codes ---",!
 N I,C S C=0,I=0
 F  S I=$O(^VA(200,I)) Q:I=""  Q:C>4  D
 . N N0 S N0=$G(^VA(200,I,0))
 . Q:N0=""
 . N AC S AC=$P($G(^VA(200,I,.1)),U,1)
 . Q:AC=""
 . S C=C+1
 . W "DUZ=",I," ",$P(N0,U,1)," DISUSER=",$P($G(^VA(200,I,7)),U,4),!
 Q
