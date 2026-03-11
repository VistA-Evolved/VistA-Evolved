ZVEDIST ;VE/KM - VistA-Evolved Distro Admin Provisioning;2026-03-10
 ;;1.0;VistA-Evolved;**1**;Mar 10, 2026;Build 1
 ;
 ; Purpose: Creates or verifies the admin user account for the distro lane.
 ;          Called from entrypoint.sh using env-injected credentials.
 ;
 ; Entry points:
 ;   PROV^ZVEDIST(AC,VC)  - Provision admin user with access/verify codes
 ;   CHKUSER^ZVEDIST      - Check if any valid user exists
 ;   VERIFY^ZVEDIST       - Verify admin setup
 ;
 ; SECURITY: This routine handles credentials. It never logs or writes
 ;           access/verify codes to globals beyond File #200 auth fields.
 ;
 ; *** Called automatically on first boot. Idempotent. ***
 ;
 Q
 ;
PROV(AC,VC) ; Provision admin user
 ; AC = access code, VC = verify code
 ;
 I $G(AC)="" W !,"ERROR: Access code required" Q
 I $G(VC)="" W !,"ERROR: Verify code required" Q
 ;
 W !,"=== Admin User Provisioning ==="
 ;
 ; Check if admin already exists by scanning for PROGRAMMER access
 N DUZ,FOUND S FOUND=0
 S DUZ=0
 F  S DUZ=$O(^VA(200,DUZ)) Q:DUZ'>0  D  Q:FOUND
 . N NAME S NAME=$P($G(^VA(200,DUZ,0)),"^",1)
 . I NAME="" Q
 . ; Check for programmer-level keys
 . I $D(^XUSEC("XUPROG",DUZ)) S FOUND=1
 . I $D(^XUSEC("XUPROGMODE",DUZ)) S FOUND=1
 ;
 I FOUND D  Q
 . W !,"Admin user already exists (DUZ="_DUZ_")"
 . W !,"Name: "_$P($G(^VA(200,DUZ,0)),"^",1)
 . W !,"Skipping provisioning."
 ;
 ; No admin found -- create one
 W !,"No admin user found. Creating..."
 ;
 ; Find next DUZ
 N NEWDUZ S NEWDUZ=$O(^VA(200,""),-1)+1
 I NEWDUZ<100 S NEWDUZ=100
 ;
 ; Create minimal user record
 N NAME S NAME="PROGRAMMER,ONE"
 ;
 ; File #200 zero node: NAME^INITIALS^SSN^...
 S ^VA(200,NEWDUZ,0)=NAME_"^PO"
 ;
 ; Set access/verify codes using the same hashing as Kernel
 ; NOTE: In a real VistA, these are encrypted by XUSHSH
 ; For the distro, we set them in the format Kernel expects
 D SETAV(NEWDUZ,AC,VC)
 ;
 ; Set user class / security keys for full admin access
 S ^XUSEC("XUPROG",NEWDUZ)=""
 S ^XUSEC("XUPROGMODE",NEWDUZ)=""
 S ^XUSEC("XUMGR",NEWDUZ)=""
 ;
 ; Set provider key
 S ^VA(200,NEWDUZ,"PS")="1"
 ;
 ; Add to B cross-ref
 S ^VA(200,"B",NAME,NEWDUZ)=""
 ;
 ; Set DUZ into parameter file for Kernel
 W !,"Created admin user: "_NAME_" (DUZ="_NEWDUZ_")"
 D VERIFY
 Q
 ;
SETAV(DUZ,AC,VC) ; Set access and verify codes for a user
 ; Uses Kernel's hash function if available
 N HAC,HVC
 ;
 ; Try to use Kernel's HASH function
 I $L($T(HASH^XUSHSH)) D  Q
 . S HAC=$$HASH^XUSHSH(AC)
 . S HVC=$$HASH^XUSHSH(VC)
 . ; Field 2 = ACCESS CODE (hashed), Field 11 = VERIFY CODE (hashed)
 . S ^VA(200,DUZ,.1)=HAC
 . S ^VA(200,DUZ,11)=HVC_"^"_$$DT^XLFDT()
 ;
 ; Fallback: set CRC-based hash (older VistA)
 I $L($T(CRC16^XLFCRC)) D  Q
 . S HAC=$$CRC16^XLFCRC(AC)
 . S HVC=$$CRC16^XLFCRC(VC)
 . S ^VA(200,DUZ,.1)=HAC
 . S ^VA(200,DUZ,11)=HVC_"^"_$$DT^XLFDT()
 ;
 ; Last resort: store as-is (not secure, but functional for dev)
 W !,"WARN: No hash function available. Storing codes directly (DEV ONLY)."
 S ^VA(200,DUZ,.1)=AC
 S ^VA(200,DUZ,11)=VC_"^"_$$DT^XLFDT()
 Q
 ;
CHKUSER ; Check if any valid user exists
 N DUZ,CNT S CNT=0
 S DUZ=0
 F  S DUZ=$O(^VA(200,DUZ)) Q:DUZ'>0  D
 . N NAME S NAME=$P($G(^VA(200,DUZ,0)),"^",1)
 . I NAME="" Q
 . S CNT=CNT+1
 . I CNT<6 W !,"  DUZ "_DUZ_": "_NAME
 ;
 W !,"Total users in File #200: "_CNT
 Q
 ;
VERIFY ; Verify admin setup
 W !,!,"=== Admin Verification ==="
 N DUZ,ADMIN S ADMIN=0
 S DUZ=0
 F  S DUZ=$O(^VA(200,DUZ)) Q:DUZ'>0  D
 . I $D(^XUSEC("XUPROG",DUZ)) D
 . . N NAME S NAME=$P($G(^VA(200,DUZ,0)),"^",1)
 . . W !,"  Admin: "_NAME_" (DUZ="_DUZ_")"
 . . S ADMIN=ADMIN+1
 ;
 I ADMIN=0 W !,"  WARNING: No admin users found!"
 E  W !,"  "_ADMIN_" admin user(s) configured."
 W !,"==========================="
 Q
 ;
