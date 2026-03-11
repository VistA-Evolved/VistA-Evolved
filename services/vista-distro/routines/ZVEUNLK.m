ZVEUNLK ;VE - Diagnose+Fix DUZ=1 lockout ;2026
 ;;1.0;VistA-Evolved;
 Q
 ;
UNLOCK ;Main entry
 N DUZ,N0,N1,NTERM,P3,P7,P11,P12,DT,HASH
 S DUZ=1
 S DT=$$DT^XLFDT
 W "=== DUZ=1 DIAGNOSTIC ===",!
 W "Today DT=",DT,!
 ;
 ; Read all relevant nodes
 S N0=$G(^VA(200,DUZ,0))
 S N1=$G(^VA(200,DUZ,.1))
 S NTERM=$G(^VA(200,DUZ,1.1))
 ;
 W !,"--- Node 0 ---",!
 W "Full: ",N0,!
 S P3=$P(N0,"^",3) W "P3 (access code): [",P3,"]",!
 S P7=$P(N0,"^",7) W "P7 (DISUSER): [",P7,"]",!
 S P11=$P(N0,"^",11) W "P11 (term date): [",P11,"]",!
 S P12=$P(N0,"^",12) W "P12: [",P12,"]",!
 ;
 W !,"--- Node .1 ---",!
 W "Full: ",N1,!
 W "P2 (verify code): [",$P(N1,"^",2),"]",!
 ;
 W !,"--- Node 1.1 ---",!
 W "Full: ",NTERM,!
 W "P2 (fail count): [",$P(NTERM,"^",2),"]",!
 W "P4 (term date2): [",$P(NTERM,"^",4),"]",!
 W "P5 (lockout until): [",$P(NTERM,"^",5),"]",!
 ;
 ; Check hash of PRO1234
 S HASH=$$EN^XUSHSH("PRO1234")
 W !,"--- Hash Check ---",!
 W "Hash of PRO1234: [",HASH,"]",!
 W "P3 stored AC: [",P3,"]",!
 I HASH=P3 W "MATCH: stored AC is already hashed correctly",!
 I HASH'=P3 W "MISMATCH: stored AC does not match hash",!
 ;
 ; Check UVALID conditions
 W !,"--- UVALID Checks ---",!
 I P11>0,P11'>DT W "** FAIL: P11 term date ",P11," <= DT ",DT," -> error 11 (terminated)",!
 I P11>0,P11>DT W "OK: P11 term date ",P11," is in the future",!
 I P11=0!(P11="") W "OK: P11 term date is empty/zero",!
 I $P(NTERM,"^",5)>0 W "** LOCKOUT: P5 of 1.1 set to ",$P(NTERM,"^",5),!
 I $P(N0,"^",7)=1 W "** FAIL: DISUSER flag is set",!
 I '$L($P(N1,"^",2)) W "** FAIL: Null verify code",!
 ;
 ; Now FIX everything
 W !,"=== APPLYING FIXES ===",!
 ;
 ; Fix 1: Clear termination date (piece 11 of node 0)
 I P11'="" D
 . W "Clearing P11 (term date)...",!
 . S $P(^VA(200,DUZ,0),"^",11)=""
 ;
 ; Fix 2: Clear DISUSER (piece 7 of node 0)
 I P7=1 D
 . W "Clearing P7 (DISUSER)...",!
 . S $P(^VA(200,DUZ,0),"^",7)=""
 ;
 ; Fix 3: Clear fail count (piece 2 of 1.1)
 S $P(^VA(200,DUZ,1.1),"^",2)=0
 W "Cleared fail count (1.1 P2)",!
 ;
 ; Fix 4: Clear lockout until (piece 5 of 1.1)
 S $P(^VA(200,DUZ,1.1),"^",5)=""
 W "Cleared lockout until (1.1 P5)",!
 ;
 ; Fix 5: Clear termination date in 1.1 (piece 4)
 I $P(NTERM,"^",4)'="" D
 . W "Clearing term date in 1.1 P4...",!
 . S $P(^VA(200,DUZ,1.1),"^",4)=""
 ;
 ; Fix 6: Rehash access code if stored cleartext
 I HASH'=P3 D
 . W "Rehashing access code PRO1234...",!
 . S $P(^VA(200,DUZ,0),"^",3)=HASH
 . ; Fix A-index too
 . I P3'="" K ^VA(200,"A",P3,DUZ)
 . S ^VA(200,"A",HASH,DUZ)=""
 . W "Updated AC hash and A-index",!
 ;
 ; Fix 7: Check and fix verify code hash
 N VHASH
 S VHASH=$$EN^XUSHSH("PRO1234!!")
 W !,"Hash of PRO1234!!: [",VHASH,"]",!
 W "Stored VC: [",$P(N1,"^",2),"]",!
 I VHASH'=$P(N1,"^",2) D
 . W "Rehashing verify code...",!
 . S $P(^VA(200,DUZ,.1),"^",2)=VHASH
 . W "Updated VC hash",!
 ;
 ; Fix 8: Clear any XUSEC entries
 K ^XUSEC("TERM",DUZ)
 K ^XUSEC("DIS",DUZ)
 W "Cleared XUSEC TERM/DIS entries",!
 ;
 ; Fix 9: Clear failed access IP entries
 N I S I=0
 F  S I=$O(^XUSEC(4,I)) Q:I'>0  D
 . K ^XUSEC(4,I)
 W "Cleared all XUSEC(4) failed access entries",!
 ;
 ; Verify
 W !,"=== POST-FIX STATE ===",!
 S N0=$G(^VA(200,DUZ,0))
 W "P3: [",$P(N0,"^",3),"]",!
 W "P7: [",$P(N0,"^",7),"]",!
 W "P11: [",$P(N0,"^",11),"]",!
 W "1.1: [",$G(^VA(200,DUZ,1.1)),"]",!
 W ".1 P2: [",$P($G(^VA(200,DUZ,.1)),"^",2),"]",!
 ;
 ; Verify A-index
 N H2 S H2=$$EN^XUSHSH("PRO1234")
 I $D(^VA(200,"A",H2,DUZ)) W "A-index OK for hashed PRO1234",!
 I '$D(^VA(200,"A",H2,DUZ)) W "** A-index MISSING for hashed PRO1234!",!
 ;
 W !,"=== DONE ===",!
 Q
