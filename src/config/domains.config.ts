import type { Domain } from '../core/registry/types';
import { energyDomain } from '../domains/energy';
import { industrialDomain } from '../domains/industrial';
import { ictDomain } from '../domains/ict';
import { smartHomeDomain } from '../domains/smart-home';

/**
 * 启用领域清单。
 * EditorEngine 启动时把这里全部注册进 DomainRegistry。
 * 新增领域：实现 Domain 后在此追加即可。
 */
export const DOMAINS: Domain[] = [energyDomain, industrialDomain, ictDomain, smartHomeDomain];
