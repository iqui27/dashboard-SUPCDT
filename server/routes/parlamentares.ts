import * as express from 'express';
import { MongoClient, Db, ObjectId } from 'mongodb';

const router = express.Router();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'secti-dashboard';

let client: MongoClient | null = null;
let db: Db | null = null;

async function connectDB() {
  if (client && db) return { client, db };
  
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  
  return { client, db };
}

/**
 * GET /api/parlamentares
 * Obtém todos os parlamentares do banco
 */
router.get('/', async (_req, res) => {
  try {
    const { db } = await connectDB();
    const parlamentaresCollection = db.collection('parlamentares');
    
    const documents = await parlamentaresCollection.find({}).toArray();
    
    // Converter ObjectId para string na resposta
    const parlamentares = documents.map(doc => ({
      ...doc,
      _id: doc._id.toString()
    }));
    
    res.json(parlamentares);
  } catch (error) {
    console.error('Erro ao buscar parlamentares:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/parlamentares/map
 * Obtém mapa de nome para ID
 */
router.get('/map', async (_req, res) => {
  try {
    const { db } = await connectDB();
    const parlamentaresCollection = db.collection('parlamentares');
    
    const documents = await parlamentaresCollection.find({}).toArray();
    const map = new Map<string, string>();
    
    documents.forEach(doc => {
      map.set(doc.nome, doc._id.toString());
    });
    
    // Converter Map para objeto na resposta
    const mapObject = Object.fromEntries(map);
    res.json(mapObject);
  } catch (error) {
    console.error('Erro ao buscar mapa de parlamentares:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/parlamentares/popular-emendas
 * Popula dados do parlamentar em emendas
 */
router.post('/popular-emendas', async (req, res) => {
  try {
    const { emendas } = req.body;
    
    // Validação mais robusta da entrada
    if (!emendas) {
      return res.status(400).json({ error: 'emendas é obrigatório' });
    }
    
    if (!Array.isArray(emendas)) {
      console.error('emendas não é array:', typeof emendas, emendas);
      return res.status(400).json({ error: 'emendas deve ser um array' });
    }
    
    if (emendas.length === 0) {
      return res.json([]);
    }
    
    const { db } = await connectDB();
    const parlamentaresCollection = db.collection('parlamentares');
    
    // Extrair IDs únicos e filtrar apenas IDs válidos (não temporários e não undefined)
    const parlamentarIds = Array.from(new Set(emendas.map(e => e.parlamentarId)))
      .filter(id => id && !id.startsWith('temp_'));
    
    // Se não há IDs válidos, retornar emendas sem parlamentar populado
    if (parlamentarIds.length === 0) {
      const emendasPopuladas = emendas.map(emenda => ({
        ...emenda,
        parlamentar: undefined
      }));
      return res.json(emendasPopuladas);
    }
    
    // Buscar parlamentares apenas com IDs válidos
    let objectIds: ObjectId[] = [];
    const validIds: string[] = [];
    
    for (const id of parlamentarIds) {
      try {
        const objectId = new ObjectId(id);
        objectIds.push(objectId);
        validIds.push(id);
      } catch (err) {
        // Ignora IDs inválidos e continua com os válidos
      }
    }
    
    if (objectIds.length === 0) {
      // Se não há ObjectIds válidos, retorna emendas sem parlamentar
      const emendasPopuladas = emendas.map(emenda => ({
        ...emenda,
        parlamentar: undefined
      }));
      return res.json(emendasPopuladas);
    }
    
    const documents = await parlamentaresCollection.find({ 
      _id: { $in: objectIds } 
    }).toArray();
    
    // Converter ObjectId para string
    const parlamentares = documents.map(doc => ({
      ...doc,
      _id: doc._id.toString()
    }));
    
    // Criar mapa de ID para parlamentar
    const parlamentarMap = new Map<string, any>();
    parlamentares.forEach(p => {
      parlamentarMap.set(p._id, p);
    });
    
    // Popular emendas
    const emendasPopuladas = emendas.map(emenda => ({
      ...emenda,
      parlamentar: parlamentarMap.get(emenda.parlamentarId)
    }));
    
    res.json(emendasPopuladas);
  } catch (error) {
    console.error('Erro ao popular emendas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
