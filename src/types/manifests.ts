
import { Database } from './database'

export type Manifest = Database['public']['Tables']['manifests']['Row']
export type ManifestInsert = Database['public']['Tables']['manifests']['Insert']
export type ManifestUpdate = Database['public']['Tables']['manifests']['Update']
