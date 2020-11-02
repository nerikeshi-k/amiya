export type GachaResultItem = {
  key: string;
  text: string;
  created_at: Date;
  maker_id: number;
  user_hash: string;
};

export type MakerPlayCount = {
  maker_id: number;
  play_count: number;
}
