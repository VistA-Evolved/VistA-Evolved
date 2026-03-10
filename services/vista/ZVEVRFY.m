ZVEVRFY ; Check created clinics
 ;
PROBE ;
 N U S U="^"
 W "IEN 940: "_$G(^SC(940,0)),!
 W "IEN 941: "_$G(^SC(941,0)),!
 W "IEN 944: "_$G(^SC(944,0)),!
 W "IEN 945: "_$G(^SC(945,0)),!
 W !,"Last 5 in B-xref starting with COPILOT:",!
 N NM S NM="COPILOT" F  S NM=$O(^SC("B",NM)) Q:NM=""  Q:$E(NM,1,7)'="COPILOT"  D
 . N IEN S IEN="" F  S IEN=$O(^SC("B",NM,IEN)) Q:IEN=""  W "  "_NM_" IEN="_IEN,!
 W !,"Entries starting with ZZ:",!
 S NM="ZZ" F  S NM=$O(^SC("B",NM)) Q:NM=""  Q:$E(NM,1,2)'="ZZ"  D
 . N IEN S IEN="" F  S IEN=$O(^SC("B",NM,IEN)) Q:IEN=""  W "  "_NM_" IEN="_IEN,!
 Q
