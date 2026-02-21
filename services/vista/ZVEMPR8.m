ZVEMPR8 ; Check msg 3267 structure ;2026-02-21
 ;
EN ;
 S U="^"
 W "=== Full dump of ^XMB(3.9,3267) ===",!
 N I S I=""
 F  S I=$O(^XMB(3.9,3267,I)) Q:I=""  D
 . W "  node "_I_": "_$G(^XMB(3.9,3267,I)),!
 . N J S J=""
 . F  S J=$O(^XMB(3.9,3267,I,J)) Q:J=""  D
 . . W "    "_I_","_J_": "_$G(^XMB(3.9,3267,I,J)),!
 . . N K S K=""
 . . F  S K=$O(^XMB(3.9,3267,I,J,K)) Q:K=""  D
 . . . W "      "_I_","_J_","_K_": "_$G(^XMB(3.9,3267,I,J,K)),!
 W "DONE",!
 Q
