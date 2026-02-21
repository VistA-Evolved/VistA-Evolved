ZVEMPR3 ; MailMan Deep Probe 3 ;2026-02-21
 ;
EN ;
 ; Create mailbox for DUZ 87 if not exists
 W "=== Creating Mailbox for DUZ 87 ===",!
 N DUZ S DUZ=87
 N XMMSG
 D CRE8MBOX^XMXMBOX(DUZ,.XMMSG)
 W "CRE8MBOX result: "_$G(XMMSG),!
 W "$D(^XMB(3.7,87,0)): "_$D(^XMB(3.7,87,0)),!
 W "^XMB(3.7,87,0)= "_$G(^XMB(3.7,87,0)),!
 ;
 ; List baskets after create
 W !,"=== Baskets after CRE8MBOX ===",!
 N BN S BN=""
 F  S BN=$O(^XMB(3.7,87,2,BN)) Q:BN=""  D
 . W "  Basket "_BN_": "_$G(^XMB(3.7,87,2,BN,0)),!
 ;
 ; Try to send a test message from DUZ 87 to self
 W !,"=== Send Test Message ===",!
 N XMSUBJ,XMBODY,XMTO,XMINSTR,XMZ,XMERR
 S XMSUBJ="VistA-Evolved Test Message P70"
 S XMBODY(1)="This is a test message from Phase 70 discovery."
 S XMBODY(2)="Line 2 of body."
 S XMTO(87)="" ; send to self (DUZ 87)
 K XMINSTR
 D SENDMSG^XMXSEND(DUZ,XMSUBJ,"XMBODY","XMTO",.XMINSTR,.XMZ)
 W "XMZ (message IEN): "_$G(XMZ),!
 I $D(XMERR) W "XMERR: "_$G(XMERR),!
 I $G(XMZ)>0 D
 . W "Sent OK. Message "_XMZ_" created.",!
 . ; Check if message appears in 3.9
 . W "^XMB(3.9,"_XMZ_",0)= "_$G(^XMB(3.9,XMZ,0)),!
 . ; Check 3.7 basket for DUZ 87
 . W !,"=== Baskets after send ===",!
 . N BN2 S BN2=""
 . F  S BN2=$O(^XMB(3.7,87,2,BN2)) Q:BN2=""  D
 . . W "  Basket "_BN2_": "_$G(^XMB(3.7,87,2,BN2,0)),!
 . . N MN,MC S MN="",MC=0
 . . F  S MN=$O(^XMB(3.7,87,2,BN2,1,MN)) Q:MN=""  D  Q:MC>5
 . . . S MC=MC+1
 . . . W "    Msg "_MN_": "_$G(^XMB(3.7,87,2,BN2,1,MN,0)),!
 E  D
 . W "Send may have had issue. Checking XMINSTR...",!
 . N K S K=""
 . F  S K=$O(XMINSTR(K)) Q:K=""  W "  XMINSTR("_K_")="_XMINSTR(K),!
 ;
 ; Message detail: read the first message
 W !,"=== Read Message Detail ===",!
 I $G(XMZ)>0 D
 . W "Subj: "_$P($G(^XMB(3.9,XMZ,0)),"^",1),!
 . W "From: "_$P($G(^XMB(3.9,XMZ,0)),"^",2),!
 . W "Date: "_$P($G(^XMB(3.9,XMZ,0)),"^",3),!
 . ; Body is in ^XMB(3.9,XMZ,2,line,0)
 . N BL S BL=0
 . F  S BL=$O(^XMB(3.9,XMZ,2,BL)) Q:BL=""  D  Q:BL>20
 . . W "  Line "_BL_": "_$G(^XMB(3.9,XMZ,2,BL,0)),!
 ;
 ; Check recipients node
 W !,"=== Recipients ===",!
 I $G(XMZ)>0 D
 . N RN S RN=""
 . F  S RN=$O(^XMB(3.9,XMZ,1,RN)) Q:RN=""  D
 . . W "  Recip node "_RN_": "_$G(^XMB(3.9,XMZ,1,RN,0)),!
 ;
 W !,"DONE",!
 Q
