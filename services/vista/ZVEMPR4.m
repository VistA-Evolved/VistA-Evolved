ZVEMPR4 ; MailMan Basket Deep Scan ;2026-02-21
 ;
EN ;
 N DUZ S DUZ=87
 ; Full dump of 3.7,87 structure
 W "=== Full ^XMB(3.7,87) dump ===",!
 N SUB S SUB=""
 F  S SUB=$O(^XMB(3.7,87,SUB)) Q:SUB=""  D
 . W "3.7,87,"_SUB_": "_$G(^XMB(3.7,87,SUB)),!
 . I $D(^XMB(3.7,87,SUB,0)) W "  ,0: "_$G(^XMB(3.7,87,SUB,0)),!
 . N S2 S S2=""
 . I SUB=2 D
 . . F  S S2=$O(^XMB(3.7,87,2,S2)) Q:S2=""  D
 . . . W "  Basket "_S2_": "_$G(^XMB(3.7,87,2,S2,0)),!
 . . . ; Look for messages in basket
 . . . N S3 S S3=""
 . . . F  S S3=$O(^XMB(3.7,87,2,S2,S3)) Q:S3=""  D
 . . . . W "    node "_S3_": ",!
 . . . . I S3=1 D
 . . . . . ; Messages under basket
 . . . . . N MN S MN=""
 . . . . . F  S MN=$O(^XMB(3.7,87,2,S2,1,MN)) Q:MN=""  D
 . . . . . . W "      Msg "_MN_": "_$G(^XMB(3.7,87,2,S2,1,MN,0)),!
 ;
 ; Check message 3264 recipients
 W !,"=== Message 3264 Recipients ===",!
 N RN S RN=""
 F  S RN=$O(^XMB(3.9,3264,RN)) Q:RN=""  D
 . W "3.9,3264,"_RN_": "_$G(^XMB(3.9,3264,RN)),!
 . I RN=1 D
 . . N R2 S R2=""
 . . F  S R2=$O(^XMB(3.9,3264,1,R2)) Q:R2=""  D
 . . . W "  1,"_R2_": "_$G(^XMB(3.9,3264,1,R2,0)),!
 . I RN=2 D
 . . N B2 S B2=""
 . . F  S B2=$O(^XMB(3.9,3264,2,B2)) Q:B2=""  D
 . . . W "  2,"_B2_": "_$G(^XMB(3.9,3264,2,B2,0)),!
 ;
 ; Check XMINSTR output keys
 W !,"=== Check XMXSEND result detail ===",!
 ; Try QMBOX to see counts
 N XMMSG
 D QMBOX^XMXMBOX(DUZ,.XMMSG)
 W "QMBOX result: "_$G(XMMSG),!
 N QK S QK=""
 F  S QK=$O(XMMSG(QK)) Q:QK=""  W "  XMMSG("_QK_")="_XMMSG(QK),!
 ;
 ; Check total new msg count
 W !,"Total new msg count: "_$$TNMSGCT^XMXUTIL(DUZ),!
 W "Total msg count: "_$$TMSGCT^XMXUTIL(DUZ),!
 W "IN basket msg count: "_$$BMSGCT^XMXUTIL(DUZ,1),!
 W "IN basket new count: "_$$BNMSGCT^XMXUTIL(DUZ,1),!
 ;
 ; List baskets via utility
 W !,"=== Basket Names ===",!
 N BK S BK=""
 F  S BK=$O(^XMB(3.7,DUZ,2,BK)) Q:BK=""  D
 . W "  "_BK_": "_$$BSKTNAME^XMXUTIL(DUZ,BK)_" (count: "_$$BMSGCT^XMXUTIL(DUZ,BK)_")",!
 ;
 W !,"DONE",!
 Q
