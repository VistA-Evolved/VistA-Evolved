import { VISTA_CONTEXT, VISTA_HOST, VISTA_PORT } from '../vista/config.js';
import { getVistaBinding } from '../auth/idp/vista-binding.js';
import type { RpcContext } from '../vista/rpcConnectionPool.js';

const commandSessionTokens = new Map<string, string>();

export function bindCommandToVistaSession(commandId: string, sessionToken: string | null): void {
  if (!commandId || !sessionToken) return;
  commandSessionTokens.set(commandId, sessionToken);
}

export function clearCommandVistaSession(commandId: string): void {
  commandSessionTokens.delete(commandId);
}

export function getCommandRpcContext(
  commandId: string,
  meta: { tenantId: string; createdBy: string }
): RpcContext | null {
  const sessionToken = commandSessionTokens.get(commandId);
  if (!sessionToken) return null;

  const binding = getVistaBinding(sessionToken);
  if (!binding) return null;

  if (String(binding.duz) !== String(meta.createdBy)) {
    return null;
  }

  const metaTenantId = typeof meta.tenantId === 'string' && meta.tenantId.trim() ? meta.tenantId.trim() : '';
  const bindingTenantId =
    typeof binding.tenantId === 'string' && binding.tenantId.trim() ? binding.tenantId.trim() : '';
  const tenantId = metaTenantId || bindingTenantId;
  if (!tenantId) {
    return null;
  }
  if (metaTenantId && bindingTenantId && metaTenantId !== bindingTenantId) {
    return null;
  }

  return {
    tenantId,
    duz: binding.duz,
    vistaHost: VISTA_HOST,
    vistaPort: VISTA_PORT,
    vistaContext: VISTA_CONTEXT,
    accessCode: binding.accessCode,
    verifyCode: binding.verifyCode,
  };
}
