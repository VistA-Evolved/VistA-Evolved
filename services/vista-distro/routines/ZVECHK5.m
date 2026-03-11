ZVECHK5 ;VistA-Evolved -- Check default institution + station 500 ;2026
 ;
CHECK ;
 N U S U="^"
 ; Default institution from KSP
 N DFLT S DFLT=$P($G(^XTV(8989.3,1,0)),U,1)
 W "DEFAULT INSTITUTION IEN: ",DFLT,!
 I DFLT W "  NAME: ",$P($G(^DIC(4,DFLT,0)),U,1),!
 I DFLT W "  NODE 99: ",$G(^DIC(4,DFLT,99)),!
 I DFLT W "  STATION: ",$P($G(^DIC(4,DFLT,99)),U,1),!
 ; Check for station 500
 W !,"Station 500 lookup: ",$G(^DIC(4,"D",500)),!
 ; Check for station 400
 W "Station 400 lookup: ",$G(^DIC(4,"D",400)),!
 ; Check IEN 400
 W !,"IEN 400 NAME: ",$P($G(^DIC(4,400,0)),U,1),!
 W "IEN 400 NODE 99: ",$G(^DIC(4,400,99)),!
 ; Look for any station with 500-range
 W !,"=== Stations 400-999 ===",!
 N K S K=399
 F  S K=$O(^DIC(4,"D",K)) Q:K=""  Q:K>999  D
 . N J S J=""
 . F  S J=$O(^DIC(4,"D",K,J)) Q:J=""  D
 . . W "STATION ",K," -> IEN ",J," ",$P($G(^DIC(4,J,0)),U,1),!
 ; Try direct XUS AV CODE simulation
 W !,"=== Simulating XUS AV CODE ===",!
 ; Set DUZ environment
 N DUZ S DUZ=1
 ; The ACCESS code check: piece 1 of .1 should be CRC hash
 N ACHASH S ACHASH=$P($G(^VA(200,DUZ,.1)),U,1)
 W "DUZ 1 access code hash: ",ACHASH,!
 ; Check what the "A" xref holds - it should be hashed
 ; Look for this hash in A xref
 N FOUND S FOUND=0
 N AXDUZ S AXDUZ=""
 F  S AXDUZ=$O(^VA(200,"A",ACHASH,AXDUZ)) Q:AXDUZ=""  D
 . W "A xref hash match: DUZ=",AXDUZ,!
 . S FOUND=1
 I 'FOUND W "Hash NOT found in A-xref!",!
 Q
