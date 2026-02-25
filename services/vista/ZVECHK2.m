ZVECHK2 ; Dump ZVE MAIL RPC raw globals
 Q
EN ;
 N IEN,NM,I,SUB
 S NM="ZVE MAIL FOLDERS"
 S IEN=$O(^XWB(8994,"B",NM,""))
 I IEN="" W "NOT FOUND: "_NM,! Q
 W "=== "_NM_" IEN="_IEN_" ===",!
 ; dump ALL nodes
 S SUB="" F  S SUB=$O(^XWB(8994,IEN,SUB)) Q:SUB=""  D
 . W "  ^XWB(8994,"_IEN_","_SUB_") = "_$G(^XWB(8994,IEN,SUB)),!
 . ; check sub-sub nodes
 . N SS S SS="" F  S SS=$O(^XWB(8994,IEN,SUB,SS)) Q:SS=""  D
 . . W "  ^XWB(8994,"_IEN_","_SUB_","_SS_") = "_$G(^XWB(8994,IEN,SUB,SS)),!
 W !
 ; Also check a known working RPC for comparison (ORQQAL LIST)
 N IEN2
 S IEN2=$O(^XWB(8994,"B","ORQQAL LIST",""))
 I IEN2="" W "ORQQAL LIST NOT FOUND",! Q
 W "=== ORQQAL LIST IEN="_IEN2_" ===",!
 S SUB="" F  S SUB=$O(^XWB(8994,IEN2,SUB)) Q:SUB=""  D
 . W "  ^XWB(8994,"_IEN2_","_SUB_") = "_$G(^XWB(8994,IEN2,SUB)),!
 . N SS S SS="" F  S SS=$O(^XWB(8994,IEN2,SUB,SS)) Q:SS=""  D
 . . W "  ^XWB(8994,"_IEN2_","_SUB_","_SS_") = "_$G(^XWB(8994,IEN2,SUB,SS)),!
 Q
