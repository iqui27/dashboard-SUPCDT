import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/client.js';
import { WIFI_MAINTENANCE_STATUSES, WIFI_POINT_STATUSES } from '../types/wifi.js';
const COLLECTION_NAME = 'wifi_social_points';
function sanitizeText(value) {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed : null;
}
function parseOptionalDate(value) {
    if (!value) {
        return null;
    }
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function toIsoDate(value) {
    if (!value || Number.isNaN(value.getTime())) {
        return null;
    }
    return value.toISOString();
}
function normalizeStatus(value) {
    return WIFI_POINT_STATUSES.includes((value ?? ''))
        ? value
        : 'implantacao';
}
function normalizeMaintenanceStatus(value, fallback) {
    if (WIFI_MAINTENANCE_STATUSES.includes((value ?? ''))) {
        return value;
    }
    if (fallback?.status === 'offline' || fallback?.precisaAcao) {
        return 'corretiva';
    }
    if (!fallback?.ultimaManutencao) {
        return 'pendente';
    }
    return 'em_dia';
}
function clampCoverage(value) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
        return 250;
    }
    return Math.min(1500, Math.max(50, normalized));
}
function normalizeCoordinate(value, fallback = 0) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
}
function normalizeOptionalNumber(value) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
}
function normalizeRequiredNumber(value) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? Math.max(0, normalized) : 0;
}
function getDaysSinceMaintenance(value) {
    if (!value) {
        return null;
    }
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}
function getWifiPriorityScore(point) {
    let score = 0;
    if (point.status === 'offline')
        score += 5;
    if (point.status === 'instavel')
        score += 3;
    if (point.status === 'implantacao')
        score += 1;
    if (point.precisaAcao)
        score += 4;
    if (point.statusManutencao === 'pendente')
        score += 3;
    if (point.statusManutencao === 'corretiva')
        score += 4;
    if (point.statusManutencao === 'preventiva')
        score += 1;
    score += Math.min(4, normalizeRequiredNumber(point.incidentesAbertos));
    const diasSemManutencao = getDaysSinceMaintenance(point.ultimaManutencao);
    if (diasSemManutencao !== null && diasSemManutencao > 180)
        score += 3;
    if (diasSemManutencao !== null && diasSemManutencao > 120 && diasSemManutencao <= 180)
        score += 2;
    return score;
}
export function mapWifiPointToApi(point) {
    const status = normalizeStatus(point.status);
    const precisaAcao = Boolean(point.precisaAcao);
    const ultimaManutencao = point.ultimaManutencao ?? null;
    const statusManutencao = normalizeMaintenanceStatus(point.statusManutencao, {
        ...point,
        status,
        precisaAcao,
        ultimaManutencao
    });
    return {
        id: point._id?.toString() ?? '',
        nome: point.nome,
        endereco: point.endereco,
        cep: sanitizeText(point.cep),
        regiaoAdministrativa: point.regiaoAdministrativa,
        latitude: point.latitude,
        longitude: point.longitude,
        status,
        coberturaRaioMetros: clampCoverage(point.coberturaRaioMetros),
        velocidadeMbps: normalizeOptionalNumber(point.velocidadeMbps),
        usuariosConectados: normalizeOptionalNumber(point.usuariosConectados),
        precisaAcao,
        statusManutencao,
        incidentesAbertos: normalizeRequiredNumber(point.incidentesAbertos),
        responsavelOperacional: sanitizeText(point.responsavelOperacional),
        ultimaManutencao: toIsoDate(ultimaManutencao),
        observacoes: sanitizeText(point.observacoes),
        createdAt: toIsoDate(point.createdAt),
        updatedAt: toIsoDate(point.updatedAt)
    };
}
export function normalizeWifiPointInput(input) {
    const status = normalizeStatus(input.status);
    const ultimaManutencao = parseOptionalDate(input.ultimaManutencao);
    const precisaAcao = Boolean(input.precisaAcao);
    return {
        nome: sanitizeText(input.nome) ?? 'Ponto sem nome',
        endereco: sanitizeText(input.endereco) ?? 'Endereço não informado',
        cep: sanitizeText(input.cep),
        regiaoAdministrativa: sanitizeText(input.regiaoAdministrativa) ?? 'Não informado',
        latitude: normalizeCoordinate(input.latitude, -15.7942),
        longitude: normalizeCoordinate(input.longitude, -47.8822),
        status,
        coberturaRaioMetros: clampCoverage(input.coberturaRaioMetros),
        velocidadeMbps: normalizeOptionalNumber(input.velocidadeMbps),
        usuariosConectados: normalizeOptionalNumber(input.usuariosConectados),
        precisaAcao,
        statusManutencao: normalizeMaintenanceStatus(input.statusManutencao, { status, precisaAcao, ultimaManutencao }),
        incidentesAbertos: normalizeRequiredNumber(input.incidentesAbertos),
        responsavelOperacional: sanitizeText(input.responsavelOperacional),
        ultimaManutencao,
        observacoes: sanitizeText(input.observacoes)
    };
}
export async function createWifiPoint(data) {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    const newPoint = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const result = await collection.insertOne(newPoint);
    return { ...newPoint, _id: result.insertedId };
}
export async function getWifiPoints(filters) {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    const query = {};
    if (filters?.status) {
        query.status = normalizeStatus(filters.status);
    }
    if (filters?.regiaoAdministrativa) {
        query.regiaoAdministrativa = filters.regiaoAdministrativa;
    }
    if (filters?.search) {
        query.$or = [
            { nome: { $regex: filters.search, $options: 'i' } },
            { endereco: { $regex: filters.search, $options: 'i' } },
            { cep: { $regex: filters.search, $options: 'i' } },
            { regiaoAdministrativa: { $regex: filters.search, $options: 'i' } },
            { responsavelOperacional: { $regex: filters.search, $options: 'i' } }
        ];
    }
    return collection.find(query).sort({ updatedAt: -1, createdAt: -1 }).toArray();
}
export async function getWifiPointById(id) {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    try {
        return await collection.findOne({ _id: new ObjectId(id) });
    }
    catch {
        return null;
    }
}
export async function updateWifiPoint(id, data) {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    try {
        const { _id, createdAt, ...fieldsToUpdate } = data;
        const result = await collection.updateOne({ _id: new ObjectId(id) }, {
            $set: {
                ...fieldsToUpdate,
                updatedAt: new Date()
            }
        });
        return result.matchedCount > 0;
    }
    catch {
        return false;
    }
}
export async function deleteWifiPoint(id) {
    const db = await getDatabase('dashboard_supcdt');
    const collection = db.collection(COLLECTION_NAME);
    try {
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
    }
    catch {
        return false;
    }
}
export function buildWifiStats(points) {
    const mapped = points.map(mapWifiPointToApi);
    const criticalPoints = mapped.filter((point) => getWifiPriorityScore(point) >= 9);
    const totals = {
        totalPontos: mapped.length,
        online: mapped.filter((point) => point.status === 'online').length,
        instavel: mapped.filter((point) => point.status === 'instavel').length,
        offline: mapped.filter((point) => point.status === 'offline').length,
        implantacao: mapped.filter((point) => point.status === 'implantacao').length,
        precisaAcao: mapped.filter((point) => point.precisaAcao).length,
        manutencaoPendente: mapped.filter((point) => point.statusManutencao === 'pendente' || point.statusManutencao === 'corretiva').length,
        incidentesAbertos: mapped.reduce((sum, point) => sum + point.incidentesAbertos, 0),
        pontosCriticos: criticalPoints.length
    };
    const totalUsuarios = mapped.reduce((sum, point) => sum + (point.usuariosConectados || 0), 0);
    const velocidades = mapped.map((point) => point.velocidadeMbps).filter((value) => typeof value === 'number');
    const regiaoMap = mapped.reduce((acc, point) => {
        acc.set(point.regiaoAdministrativa, (acc.get(point.regiaoAdministrativa) || 0) + 1);
        return acc;
    }, new Map());
    const regiaoCriticaMap = mapped.reduce((acc, point) => {
        if (getWifiPriorityScore(point) >= 6) {
            acc.set(point.regiaoAdministrativa, (acc.get(point.regiaoAdministrativa) || 0) + 1);
        }
        return acc;
    }, new Map());
    const filaAtencao = [...mapped]
        .sort((a, b) => {
        const scoreDiff = getWifiPriorityScore(b) - getWifiPriorityScore(a);
        if (scoreDiff !== 0) {
            return scoreDiff;
        }
        return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    })
        .slice(0, 5);
    return {
        ...totals,
        totalUsuarios,
        velocidadeMedia: velocidades.length
            ? Number((velocidades.reduce((sum, value) => sum + value, 0) / velocidades.length).toFixed(1))
            : 0,
        regioesAtendidas: regiaoMap.size,
        distribStatus: [
            { name: 'Online', value: totals.online },
            { name: 'Instável', value: totals.instavel },
            { name: 'Offline', value: totals.offline },
            { name: 'Implantação', value: totals.implantacao }
        ],
        pontosPorRegiao: Array.from(regiaoMap.entries())
            .map(([regiaoAdministrativa, total]) => ({ regiaoAdministrativa, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10),
        regioesCriticas: Array.from(regiaoCriticaMap.entries())
            .map(([regiaoAdministrativa, total]) => ({ regiaoAdministrativa, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10),
        filaAtencao,
        recentes: mapped.slice(0, 5)
    };
}
