ZVEMPR5 ; MailMan Count Check ;2026-02-21
 ;
EN ;
 N DUZ S DUZ=87
 S U="^"
 S DT=$$DT^XLFDT
 ;
 W "Total new: "_$$TNMSGCT^XMXUTIL(DUZ),!
 W "Total msgs: "_$$TMSGCT^XMXUTIL(DUZ),!
 ;
 ; Basket counts
 N BK S BK=""
 F  S BK=$O(^XMB(3.7,DUZ,2,BK)) Q:BK=""  D
 . W "Basket "_BK_" ("_$$BSKTNAME^XMXUTIL(DUZ,BK)_"): total="_$$BMSGCT^XMXUTIL(DUZ,BK)_" new="_$$BNMSGCT^XMXUTIL(DUZ,BK),!
 ;
 ; Check if msg 3264 is in the user's mailbox
 W !,"=== Message 3264 in baskets? ===",!
 N BK2 S BK2=""
 F  S BK2=$O(^XMB(3.7,DUZ,2,BK2)) Q:BK2=""  D
 . I $D(^XMB(3.7,DUZ,2,BK2,1,3264)) W "  Found 3264 in basket "_BK2,!
 ;
 ; Maybe the message delivery is pending. Let's check ^XMB(3.9,3264) thoroughly
 W !,"=== Full ^XMB(3.9,3264) ===",!
 N ND S ND=""
 F  S ND=$O(^XMB(3.9,3264,ND)) Q:ND=""  D
 . W "  node "_ND_": "_$G(^XMB(3.9,3264,ND)),!
 . ; sub-nodes for 1 (recipients) and 2 (body)
 . I ND=1!(ND=2)!(ND=3)!(ND=4) D
 . . N SN S SN=""
 . . F  S SN=$O(^XMB(3.9,3264,ND,SN)) Q:SN=""  D
 . . . W "    "_ND_","_SN_": "_$G(^XMB(3.9,3264,ND,SN,0)),!
 ;
 ; Try TaskMan delivery -- check if XMD background is needed
 W !,"=== Attempt manual delivery ===",!
 ; Try D BLDNSND^XMXSEND or manual push
 ; The issue is SENDMSG creates the msg but delivery is via TaskMan
 ; Let's manually push msg 3264 into DUZ 87's IN basket
 I '$D(^XMB(3.7,DUZ,2,1,1,3264)) D
 . S ^XMB(3.7,DUZ,2,1,1,3264,0)=3260221.042738
 . W "Manually placed 3264 into IN basket",!
 E  D
 . W "3264 already in IN basket",!
 ;
 ; Recheck counts
 W !,"Updated counts:",!
 W "Total msgs: "_$$TMSGCT^XMXUTIL(DUZ),!
 W "IN basket: "_$$BMSGCT^XMXUTIL(DUZ,1),!
 ;
 ; Now read a message the way our RPC will
 W !,"=== Read Message Format ===",!
 N XMZ S XMZ=3264
 W "Subj: "_$P($G(^XMB(3.9,XMZ,0)),U,1),!
 W "From DUZ: "_$P($G(^XMB(3.9,XMZ,0)),U,2),!
 W "Date: "_$P($G(^XMB(3.9,XMZ,0)),U,3),!
 ; From name
 N FDUZ S FDUZ=$P($G(^XMB(3.9,XMZ,0)),U,2)
 I FDUZ>0 W "From Name: "_$P($G(^VA(200,FDUZ,0)),U,1),!
 ; Body lines
 N BL S BL=0
 F  S BL=$O(^XMB(3.9,XMZ,2,BL)) Q:BL=""  D
 . W "  Body["_BL_"]: "_$G(^XMB(3.9,XMZ,2,BL,0)),!
 ;
 W !,"DONE",!
 Q
