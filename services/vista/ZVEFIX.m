ZVEFIX ;VistA-Evolved -- Clear DISUSER flag on DUZ=1 ;2026
 ;
FIX ;
 N U S U="^"
 N N0 S N0=$G(^VA(200,1,0))
 W "BEFORE: piece 7 = ",$P(N0,U,7),!
 S $P(N0,U,7)=""
 S ^VA(200,1,0)=N0
 W "AFTER:  piece 7 = ",$P($G(^VA(200,1,0)),U,7),!
 W "Full node 0: ",$G(^VA(200,1,0)),!
 W "DISUSER cleared for DUZ=1 (PROGRAMMER,ONE)",!
 Q
