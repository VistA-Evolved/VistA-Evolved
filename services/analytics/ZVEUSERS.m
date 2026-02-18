 ; Create ROcto users for VistA-Evolved analytics
 ; Octo v1.1 does not support CREATE USER SQL — users are stored
 ; directly in ^%ydboctoocto("users",...) globals.
 ;
 ; Format matches pg_catalog.pg_authid pipe-delimited layout:
 ; oid|rolname|rolsuper|rolinherit|rolcreaterole|rolcreatedb|rolcanlogin|
 ;   rolreplication|rolbypassrls|rolconnlimit|rolpassword|rolvaliduntil
 ; Password: md5 + md5(password + username)
 ;
 ; Hardcoded dev-only passwords (change in production):
 ;   etl_writer / etl_writer_pass
 ;   bi_readonly / bi_readonly_pass
 ;
 ; Usage: mumps -run ZVEUSERS
ZVEUSERS ;
 W "Creating ROcto users...",!
 ; etl_writer (OID 10): md5(etl_writer_pass + etl_writer)
 I '$D(^%ydboctoocto("users","etl_writer")) D
 . S ^%ydboctoocto("users","etl_writer")="10|etl_writer|f|t|f|f|t|f|f|-1|md5b9c375e416e3e6f04c56ff5b4a6b247f|"
 . S ^%ydboctoocto("users","etl_writer","permissions")=1
 . W "  etl_writer created (readwrite)",!
 E  D
 . ; Ensure permissions=1 even if user already existed with permissions=0
 . S ^%ydboctoocto("users","etl_writer","permissions")=1
 . W "  etl_writer exists (permissions updated to readwrite)",!
 ; bi_readonly (OID 11): md5(bi_readonly_pass + bi_readonly)
 I '$D(^%ydboctoocto("users","bi_readonly")) D
 . S ^%ydboctoocto("users","bi_readonly")="11|bi_readonly|f|t|f|f|t|f|f|-1|md5e15ed1b3f773fe1693381685165ff0cb|"
 . S ^%ydboctoocto("users","bi_readonly","permissions")=0
 . W "  bi_readonly created",!
 E  W "  bi_readonly exists",!
 W "ROcto users ready.",!
 Q
