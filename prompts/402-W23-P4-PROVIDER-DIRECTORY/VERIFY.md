# 402-99-VERIFY — Provider Directory

## Verification Gates

1. Types export DirectoryPractitioner, DirectoryOrganization, DirectoryLocation
2. Store has CRUD + search for all 3 resource types
3. FIFO eviction with `>=` on all 3 stores
4. Routes registered, AUTH_RULES for `/provider-directory/`
5. 3 STORE_INVENTORY entries
6. `tsc --noEmit` clean
