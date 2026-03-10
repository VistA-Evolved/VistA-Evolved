ZVEPRB2 ; Ward field probe
 ;
PROBE ;
 N U,F,NM,TP,ND,PC
 S U="^"
 W "=== Ward #1 0-node ===",!
 W $G(^DIC(42,1,0)),!
 W !,"=== Pieces of 0-node ===",!
 F I=1:1:15 W "Piece ",I,": ",$P($G(^DIC(42,1,0)),U,I),!
 W !,"=== File #42 DD fields (editable) ===",!
 S F=0
 F  S F=$O(^DD(42,F)) Q:F=""  D
 . S NM=$P($G(^DD(42,F,0)),U,1)
 . S TP=$P($G(^DD(42,F,0)),U,2)
 . S ND=$P($G(^DD(42,F,0)),U,4)
 . W F," = ",NM
 . I TP["C" W " [COMPUTED]"
 . I ND'="" W " node:",ND
 . W !
 W !,"=== File #50 Drug #1 field check ===",!
 W "Drug 0-node: ",$G(^PSDRUG(1,0)),!
 W "Field 2 DD: ",$P($G(^DD(50,2,0)),U,1),!
 W "Field .02 DD: ",$P($G(^DD(50,.02,0)),U,1),!
 W !,"=== File #60 Lab Test 1 field check ===",!
 W "Test 0-node: ",$G(^LAB(60,1,0)),!
 W "Field 3 DD: ",$P($G(^DD(60,3,0)),U,1),!
 W "Field .03 DD: ",$P($G(^DD(60,.03,0)),U,1),!
 W "Field 4 DD: ",$P($G(^DD(60,4,0)),U,1),!
 W "Field .04 DD: ",$P($G(^DD(60,.04,0)),U,1),!
 W "Field 9 DD: ",$P($G(^DD(60,9,0)),U,1),!
 W "Field .09 DD: ",$P($G(^DD(60,.09,0)),U,1),!
 W !,"=== File #49 Svc field check ===",!
 W "Field 1 DD: ",$P($G(^DD(49,1,0)),U,1),!
 W "Field .02 DD: ",$P($G(^DD(49,.02,0)),U,1),!
 W "Field 2 DD: ",$P($G(^DD(49,2,0)),U,1),!
 W "Field .03 DD: ",$P($G(^DD(49,.03,0)),U,1),!
 Q
