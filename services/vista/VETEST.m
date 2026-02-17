VETEST ;VE/KM - Test ZVEMIOP routines;2026-02-17
 ;
 W "=== Testing LINKS^ZVEMIOP ===",!
 N R D LINKS^ZVEMIOP(.R,5)
 W "RESULT(0): ",R(0),!
 N I S I=0
 F  S I=$O(R(I)) Q:I=""  W "  R(",I,"): ",R(I),!
 ;
 W !,"=== Testing MSGS^ZVEMIOP ===",!
 K R D MSGS^ZVEMIOP(.R,24)
 W "RESULT(0): ",R(0),!
 N I S I=0
 F  S I=$O(R(I)) Q:I=""  W "  R(",I,"): ",R(I),!
 ;
 W !,"=== Testing HLOSTAT^ZVEMIOP ===",!
 K R D HLOSTAT^ZVEMIOP(.R)
 W "RESULT(0): ",R(0),!
 N I S I=0
 F  S I=$O(R(I)) Q:I=""  W "  R(",I,"): ",R(I),!
 ;
 W !,"=== Testing QLENGTH^ZVEMIOP ===",!
 K R D QLENGTH^ZVEMIOP(.R)
 W "RESULT(0): ",R(0),!
 N I S I=0
 F  S I=$O(R(I)) Q:I=""  W "  R(",I,"): ",R(I),!
 ;
 W !,"=== ALL TESTS DONE ===",!
 Q
