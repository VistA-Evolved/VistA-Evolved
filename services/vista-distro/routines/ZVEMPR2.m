ZVEMPR2 ; MailMan Deep Probe ;2026-02-21
 ;
EN ;
 ; First check if DUZ 87 mailbox node exists at all
 W "=== Mailbox Structure ===",!
 W "$D(^XMB(3.7,87,0)): "_$D(^XMB(3.7,87,0)),!
 W "^XMB(3.7,87,0)= "_$G(^XMB(3.7,87,0)),!
 ;
 ; Check XMXAPI entrypoints by reading first 60 lines
 W !,"=== XMXAPI Entry Points ===",!
 N J,LN
 F J=1:1:80 D
 . S LN=$T(+J^XMXAPI) Q:LN=""
 . I $E(LN)'=" " W J_": "_$E(LN,1,70),!
 ;
 ; Check XMXMBOX entrypoints
 W !,"=== XMXMBOX Entry Points ===",!
 F J=1:1:80 D
 . S LN=$T(+J^XMXMBOX) Q:LN=""
 . I $E(LN)'=" " W J_": "_$E(LN,1,70),!
 ;
 ; Check XMXMSGS entrypoints
 W !,"=== XMXMSGS Entry Points ===",!
 F J=1:1:80 D
 . S LN=$T(+J^XMXMSGS) Q:LN=""
 . I $E(LN)'=" " W J_": "_$E(LN,1,70),!
 ;
 ; Check XMXSEND entrypoints
 W !,"=== XMXSEND Entry Points ===",!
 F J=1:1:80 D
 . S LN=$T(+J^XMXSEND) Q:LN=""
 . I $E(LN)'=" " W J_": "_$E(LN,1,70),!
 ;
 ; Check existing messages in 3.9
 W !,"=== Messages in ^XMB(3.9) ===",!
 N MN,CT S MN="",CT=0
 F  S MN=$O(^XMB(3.9,MN)) Q:MN=""  D  Q:CT>10
 . S CT=CT+1
 . W "  MSG "_MN_": "_$G(^XMB(3.9,MN,0)),!
 ;
 ; Check if DUZ 87 has any basket at all - try direct create
 ; Probe the mailbox init (INITSTRUC^XMXUTIL)
 W !,"=== XMXUTIL Entry Points ===",!
 F J=1:1:80 D
 . S LN=$T(+J^XMXUTIL) Q:LN=""
 . I $E(LN)'=" " W J_": "_$E(LN,1,70),!
 ;
 W !,"DONE",!
 Q
