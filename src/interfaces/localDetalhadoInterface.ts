// src/interfaces/localDetalhadoInterface.ts
export interface LocalDetalhado {
  Code: string;
  Label_Code: string;
  Name: string;
  Parent_Location_Id: number | null;
  Is_Movable: boolean;
  Is_Active: boolean;
  Created_At: string;
  Created_By: string;
  Activated_At: string | null;
  Activated_By: string | null;
  Location_Id: number;
  Warehouse_Code: string;
  Zone_Code: string;
  Aisle_Code: string;
  Rack_Code: string;
  Shelf_Code: string;
  Bin_Code: string;
  picking_Order: number;
  Quantity : number;
  Product_id : number;
  Cd_Produto : string;
  Ds_Produto : string;
  ImageUrl : string;
}
