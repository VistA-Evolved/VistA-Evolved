ZVEMPRB ; MailMan Probe ;2026-02-21
 ;
EN ;
 N R
 W "=== Routine Check ===",!
 S R="XMXAPI" D CHK
 S R="XMXMBOX" D CHK
 S R="XMXMSGS" D CHK
 S R="XMXMSGS1" D CHK
 S R="XMXSEND" D CHK
 S R="XMXLIST" D CHK
 S R="XMXUTIL" D CHK
 S R="XMXUTIL2" D CHK
 S R="XMA1" D CHK
 S R="XMA21" D CHK
 S R="XMR" D CHK
 S R="XMD" D CHK
 S R="DSICXM" D CHK
 S R="XMXAPIB" D CHK
 W !,"=== Globals ===",!
 W "XMB(1): "_$D(^XMB(1)),!
 W "XMB(3.7): "_$D(^XMB(3.7)),!
 W "XMB(3.9): "_$D(^XMB(3.9)),!
 W !,"=== DUZ 87 Mailbox ===",!
 W "3.7,87: "_$D(^XMB(3.7,87)),!
 W "3.7,87,2: "_$D(^XMB(3.7,87,2)),!
 N BN S BN=""
 F  S BN=$O(^XMB(3.7,87,2,BN)) Q:BN=""  D
 . W "  Basket "_BN_": "_$G(^XMB(3.7,87,2,BN,0)),!
 W !,"=== Message Count ===",!
 N CT,MN S CT=0,MN=""
 F  S MN=$O(^XMB(3.9,MN)) Q:MN=""  S CT=CT+1 Q:CT>5
 W "First message IENs in 3.9: "_CT,!
 W "DONE",!
 Q
CHK ;
 N E
 S E=$T(+1^@R)
 W R_": "_$S(E'="":"EXISTS",1:"MISSING"),!
 Q
