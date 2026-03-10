ZVECHK6 ;VistA-Evolved -- Direct AV CODE test ;2026
 ;
CHECK ;
 N U S U="^"
 ; Simulate what XUS AV CODE does internally
 ; The tag is VALIDAV^XUSRB1
 ; Set up necessary environment
 S DUZ=0
 ; Call the actual routine with PRO1234;PRO1234!!
 ; XUS AV CODE expects encrypted input in RPC(0)
 ; But we can call the internal validation tag
 ; Let's check what routine handles it
 W "=== Checking XUSRB1 routine ===",!
 ; Check if XUSRB1 exists
 N X S X="XUSRB1"
 W "XUSRB1 routine exists: "
 I $T(VALIDAV^XUSRB1)'="" W "YES",!
 E  W "NO",!
 ; Let's also check what XUS AV CODE actually calls
 N RPCIEN S RPCIEN=12
 W "RPC IEN 12 TAG: ",$P($G(^XWB(8994,RPCIEN,0)),U,1),!
 W "RPC IEN 12 RTAG: ",$G(^XWB(8994,RPCIEN,.1)),!
 W "RPC IEN 12 RNAME: ",$G(^XWB(8994,RPCIEN,.2)),!
 W "RPC IEN 12 INPUT: ",$G(^XWB(8994,RPCIEN,.3)),!
 ; Now let's try to call the actual validation
 ; First set up what Kernel needs
 N XESSION
 S XESSION("AV")="PRO1234;PRO1234!!"
 S DUZ=0
 W !,"=== Calling SETUP^XUSRB1 ===",!
 ; XUS AV CODE entry point
 N XESSION,RESULT
 K ^TMP("XUS",$J)
 ; The actual RPC sets RESULT array
 N DUZ S DUZ=0
 D SETUP^XUSRB1
 W "After SETUP DUZ=",DUZ,!
 ; Now try VALIDAV
 N XQY0,XESSION
 ; Set up the AV code as VistA expects it
 ; VALIDAV expects the code in XESSION("AV") or RPC("PARAM",1)
 ; or from the client
 ; Let's try the direct hash lookup
 W !,"=== Manual Access Code Lookup ===",!
 N ACHASH
 ; VistA uses $$ENCRYP($P(AVCODE,";",1)) to hash access code
 ; The hash function is CRC16 
 ; Let's just search for DUZ 1 in the new person file
 W "Node 0 piece 3 (FileMan AC): ",$P($G(^VA(200,1,0)),U,3),!
 ; The access code in piece 3 of node 0 is "PRO1234"
 ; In VistA the "A" xref uses the encryped version
 ; Let's call ENCRYP to hash PRO1234
 N HASH
 S HASH=$$ENCRYP^XUSRB1("PRO1234")
 W "ENCRYP PRO1234 = ",HASH,!
 ; Now check if it's in the A xref
 W "A xref for hash: ",$O(^VA(200,"A",HASH,""))
 W !
 Q
