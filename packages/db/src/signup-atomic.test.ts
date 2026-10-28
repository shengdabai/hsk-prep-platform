import {beforeEach, expect, test, vi} from 'vitest';
const db = vi.hoisted(() => ({insert: vi.fn(), from: vi.fn()}));
vi.mock('./supabase', () => ({createSupabaseAdminClient: () => ({from: db.from})}));
import {supabaseRepository} from './supabase-repository';
const user={id:'fixture-user',email:'fixture@example.invalid',fullName:'Fixture',role:'learner' as const,plan:'free' as const};
beforeEach(()=>{vi.clearAllMocks();db.from.mockReturnValue({insert:db.insert});});
test('profile and password are supplied in one atomic insert',async()=>{
 db.insert.mockResolvedValue({error:null});
 expect(await supabaseRepository.createUserWithPassword(user,'fixture-hash')).toEqual(user);
 expect(db.from).toHaveBeenCalledTimes(1);expect(db.from).toHaveBeenCalledWith('profiles');
 expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({id:user.id,email:user.email,password_hash:'fixture-hash'}));
});
test('failed insert propagates and duplicate cannot overwrite a profile',async()=>{
 db.insert.mockResolvedValueOnce({error:{code:'fixture',message:'temporary failure'}});
 await expect(supabaseRepository.createUserWithPassword(user,'fixture-hash')).rejects.toThrow();
 db.insert.mockResolvedValueOnce({error:{code:'23505',message:'duplicate'}});
 expect(await supabaseRepository.createUserWithPassword(user,'replacement')).toBeNull();
 db.insert.mockResolvedValueOnce({error:null});
 expect(await supabaseRepository.createUserWithPassword(user,'fixture-hash')).toEqual(user);
});
