export interface AtvrApiResponse {
  d: string;
}

export interface DoSearchInput {
	category?: string
  shop?: number;
  taste?: string;
  taste2?: string;
  skip?: number;
  count?: number;
  orderBy?: string;
  sortOrder?: "desc" | "asc";
}

export interface AtvrProduct {
  ProductID: number;
  ProductName: string;
  ProductBottledVolume: number;
  ProductAlchoholVolume: number;
  ProductPrice: number;
  ProductFoodCategories: string;
  ProductCategory: AtvrProductCategory;
  ProductSubCategory?: any;
  ProductCountryOfOrigin: string;
  ProductSpecialReserve: boolean;
  ProductOrganic: boolean;
  ProductContainerType: string;
  ProductPlaceOfOrigin: string;
  ProductDistrictOfOrigin: string;
  ProductWine: string;
  ProductInventory: number;
  ProductYear: string;
  ProductDateOnMarket: Date;
  ProductIsTemporaryOnSale: boolean;
  ProductIsGift: boolean;
  ProductIsInThema: boolean;
  ProductIsAvailableInStores: boolean;
  ProductIsSpecialOrder: boolean;
  ProductStoreSelected?: ProductSelectedStore;
  ProductTasteGroup: string;
  ProductTasteGroup2: string;
  ProductTasteGroup2Description?: any;
  ProductPackagingClosing: string;
  ProductSpecialMarking: any[];
  ProductSeasonCode: string;
  MinimumQuantity: number;
  UseMinimumQuantityAsUnit: boolean;
  IsSpecialOrderAndOutOfStock: boolean;
  ProductSearchGrape: string;
  ProductProducer: string;
  ProductShortDescription: string;
  ProductBackupInventory: number;
  ProductPackagingWeight: number;
  ProductCarbonFootprint: number;
  SupplierId?: any;
  ProductAvailableUnits: string;
}

export interface ProductSelectedStore {
  ID: number;
  Code: string;
  Name: string;
  Quantity: number;
  Created: string;
  Modified: string;
}

export interface AtvrTasteCategory {
  id: string;
  slug: string;
  description: string;
}

export interface AtvrTaste2Category {
  id: string;
  Description: string;
  superTaste: string;
}

export interface AtvrProductCategory {
  name: string;
  id: string[];
  taste: boolean;
  sweet: boolean;
  subCategories?: any;
}

export interface DoSearchResponse {
  data: AtvrProduct[];
  total: number;
}

export interface Weekday {
  date: string;
  weekday: string;
  open: string;
  isDefault: boolean;
}

export interface StoresInput {
  skip?: number;
  count?: number;
  orderBy?: string;
  sortOrder?: "desc" | "asc";
}

export interface AtvrStore {
  NewsID: string;
  Name: string;
  Email: string;
  Phone: string;
  Address: string;
  PostCode: string;
  Size: string;
  Manager: string;
  AssistantManager: string;
  GoogleMapsLink: string;
  GPSN: string;
  GPSW: string;
  MondayToThursday: string;
  Friday: string;
  Saturday: string;
  Sunday: string;
  WinterMondayToThursday: string;
  WinterFriday: string;
  WinterSaturday: string;
  WinterSunday: string;
  MapsImageUrl: string;
  ImageUrl: string;
  ImageText: string;
  Preview: string;
  newsUrl: string;
  today: Weekday;
  day1: Weekday;
  day2: Weekday;
  day3: Weekday;
  day4: Weekday;
  day5: Weekday;
  day6: Weekday;
  day7: Weekday;
  isOpenNow: boolean;
  description: string;
  Distance: number;
}
