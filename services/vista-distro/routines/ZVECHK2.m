ZVECHK2 ;VistA-Evolved -- Deep auth check for DUZ=1 ;2026
 ;
CHECK ;
 N DUZ,U S U="^",DUZ=1
 W "=== Deep Auth Check for DUZ=1 ===",!
 W "NODE 0: ",$G(^VA(200,DUZ,0)),!
 W "NODE .1: ",$G(^VA(200,DUZ,.1)),!
 W "NODE 3: ",$G(^VA(200,DUZ,3)),!
 W "NODE 7: ",$G(^VA(200,DUZ,7)),!
 W "NODE 201: ",$G(^VA(200,DUZ,201)),!
 W "DIVISION(0): ",$G(^VA(200,DUZ,"DIVISION",0)),!
 N I S I=0
 F  S I=$O(^VA(200,DUZ,"DIVISION",I)) Q:I=""  D
 . W "DIVISION(",I,"): ",$G(^VA(200,DUZ,"DIVISION",I)),!
 W "TERMINATION DATE (7p2): ",$P($G(^VA(200,DUZ,7)),U,2),!
 W "DISUSER (7p4): ",$P($G(^VA(200,DUZ,7)),U,4),!
 W "FM ACCESS CODE (3p1): ",$P($G(^VA(200,DUZ,3)),U,1),!
 W "VC NEVER EXPIRES (.1p3): ",$P($G(^VA(200,DUZ,.1)),U,3),!
 W "DATE LAST SIGN-ON (.1p4): ",$P($G(^VA(200,DUZ,.1)),U,4),!
 W "PERSON CLASS: ",$G(^VA(200,DUZ,"USC")),!
 W "XUS SIGNON SETUP IEN: ",$G(^XWB(8994,"B","XUS SIGNON SETUP")),!
 W "XUS AV CODE IEN: ",$G(^XWB(8994,"B","XUS AV CODE")),!
 W "XUS GET USER INFO IEN: ",$G(^XWB(8994,"B","XUS GET USER INFO")),!
 N AC S AC=$P($G(^VA(200,DUZ,.1)),U,1)
 W "Access Code stored: ",AC,!
 ; Check A xref for access code lookup
 W "A xref (first 5):",!
 N K,CT S K="",CT=0
 F  S K=$O(^VA(200,"A",K)) Q:K=""  Q:CT>4  D
 . W "  A(",K,")=",$G(^VA(200,"A",K)),!
 . S CT=CT+1
 Q
