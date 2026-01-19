// Vehicle brands and models data for Argentina market
// This can be replaced by database queries later

export interface VehicleModel {
  name: string;
  years?: number[];
}

export interface VehicleBrand {
  id: string;
  name: string;
  type: 'auto' | 'moto' | 'camioneta';
  models: VehicleModel[];
}

export const vehicleBrands: VehicleBrand[] = [
  // Autos
  {
    id: 'chevrolet',
    name: 'Chevrolet',
    type: 'auto',
    models: [
      { name: 'Cruze' },
      { name: 'Onix' },
      { name: 'Tracker' },
      { name: 'Spin' },
      { name: 'Joy' },
      { name: 'Prisma' },
      { name: 'Corsa' },
    ],
  },
  {
    id: 'fiat',
    name: 'Fiat',
    type: 'auto',
    models: [
      { name: 'Cronos' },
      { name: 'Argo' },
      { name: 'Mobi' },
      { name: 'Pulse' },
      { name: 'Palio' },
      { name: 'Siena' },
      { name: 'Uno' },
    ],
  },
  {
    id: 'ford',
    name: 'Ford',
    type: 'auto',
    models: [
      { name: 'Focus' },
      { name: 'Fiesta' },
      { name: 'Ka' },
      { name: 'Territory' },
      { name: 'Mondeo' },
      { name: 'EcoSport' },
    ],
  },
  {
    id: 'honda',
    name: 'Honda',
    type: 'auto',
    models: [
      { name: 'Civic' },
      { name: 'City' },
      { name: 'HR-V' },
      { name: 'Fit' },
      { name: 'CR-V' },
      { name: 'Accord' },
    ],
  },
  {
    id: 'peugeot',
    name: 'Peugeot',
    type: 'auto',
    models: [
      { name: '208' },
      { name: '2008' },
      { name: '308' },
      { name: '3008' },
      { name: '408' },
      { name: '5008' },
    ],
  },
  {
    id: 'renault',
    name: 'Renault',
    type: 'auto',
    models: [
      { name: 'Sandero' },
      { name: 'Logan' },
      { name: 'Stepway' },
      { name: 'Duster' },
      { name: 'Captur' },
      { name: 'Kangoo' },
      { name: 'Megane' },
    ],
  },
  {
    id: 'toyota',
    name: 'Toyota',
    type: 'auto',
    models: [
      { name: 'Corolla' },
      { name: 'Yaris' },
      { name: 'Etios' },
      { name: 'Camry' },
      { name: 'RAV4' },
      { name: 'Corolla Cross' },
    ],
  },
  {
    id: 'volkswagen',
    name: 'Volkswagen',
    type: 'auto',
    models: [
      { name: 'Gol' },
      { name: 'Polo' },
      { name: 'Virtus' },
      { name: 'Vento' },
      { name: 'T-Cross' },
      { name: 'Nivus' },
      { name: 'Taos' },
      { name: 'Golf' },
    ],
  },
  {
    id: 'nissan',
    name: 'Nissan',
    type: 'auto',
    models: [
      { name: 'Kicks' },
      { name: 'Versa' },
      { name: 'Sentra' },
      { name: 'March' },
      { name: 'X-Trail' },
    ],
  },
  {
    id: 'citroen',
    name: 'Citroën',
    type: 'auto',
    models: [
      { name: 'C3' },
      { name: 'C4 Cactus' },
      { name: 'C4 Lounge' },
      { name: 'Berlingo' },
    ],
  },
  // Motos
  {
    id: 'honda-moto',
    name: 'Honda',
    type: 'moto',
    models: [
      { name: 'CG 150 Titan' },
      { name: 'Wave 110' },
      { name: 'CB 250 Twister' },
      { name: 'XR 150' },
      { name: 'CB 190 R' },
      { name: 'Tornado 250' },
    ],
  },
  {
    id: 'yamaha',
    name: 'Yamaha',
    type: 'moto',
    models: [
      { name: 'FZ 25' },
      { name: 'YBR 125' },
      { name: 'FZ 16' },
      { name: 'MT-03' },
      { name: 'XTZ 250' },
      { name: 'Crypton 110' },
    ],
  },
  {
    id: 'bajaj',
    name: 'Bajaj',
    type: 'moto',
    models: [
      { name: 'Rouser 200' },
      { name: 'Rouser 160' },
      { name: 'Dominar 400' },
    ],
  },
  {
    id: 'zanella',
    name: 'Zanella',
    type: 'moto',
    models: [
      { name: 'ZR 150' },
      { name: 'RX 150' },
      { name: 'Sapucai 150' },
    ],
  },
  // Camionetas
  {
    id: 'toyota-cam',
    name: 'Toyota',
    type: 'camioneta',
    models: [
      { name: 'Hilux' },
      { name: 'SW4' },
    ],
  },
  {
    id: 'ford-cam',
    name: 'Ford',
    type: 'camioneta',
    models: [
      { name: 'Ranger' },
      { name: 'F-150' },
    ],
  },
  {
    id: 'volkswagen-cam',
    name: 'Volkswagen',
    type: 'camioneta',
    models: [
      { name: 'Amarok' },
      { name: 'Saveiro' },
    ],
  },
  {
    id: 'chevrolet-cam',
    name: 'Chevrolet',
    type: 'camioneta',
    models: [
      { name: 'S10' },
      { name: 'Montana' },
    ],
  },
  {
    id: 'fiat-cam',
    name: 'Fiat',
    type: 'camioneta',
    models: [
      { name: 'Toro' },
      { name: 'Strada' },
    ],
  },
  {
    id: 'nissan-cam',
    name: 'Nissan',
    type: 'camioneta',
    models: [
      { name: 'Frontier' },
    ],
  },
];

export const getBrandsByType = (type: 'auto' | 'moto' | 'camioneta') => {
  return vehicleBrands.filter(b => b.type === type);
};

export const getModelsByBrand = (brandId: string) => {
  const brand = vehicleBrands.find(b => b.id === brandId);
  return brand?.models || [];
};

export const generateYears = (startYear = 2000) => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear + 1; year >= startYear; year--) {
    years.push(year);
  }
  return years;
};

export const COVERAGE_TYPES = [
  { id: 'terceros', label: 'Responsabilidad Civil', description: 'Cobertura básica obligatoria' },
  { id: 'terceros_completo', label: 'Terceros Completo', description: 'RC + Robo + Incendio' },
  { id: 'todo_riesgo', label: 'Todo Riesgo', description: 'Cobertura integral con franquicia' },
] as const;

export const VEHICLE_USES = [
  { id: 'particular', label: 'Particular' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'uber', label: 'Uber/Remis/App' },
] as const;
