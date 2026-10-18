import {renderHook,act,cleanup} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {useProfileBoundary} from '@/features/profiles/use-profile-boundary'
import {emptyProfile,type PublicProfile} from '@/features/profiles/profile-contract'
afterEach(()=>{cleanup();vi.useRealTimers()})
it('F31-C07 refreshes the published projection before the measurement token expires, reusing the temporal boundary',async()=>{
 vi.useFakeTimers();const refresh=vi.fn().mockResolvedValue(undefined),profile:PublicProfile={...emptyProfile(),restricted:false,publishedRevisionId:1,serverNow:'2026-10-18T12:00:00Z',measurement:{profileId:'profile',revisionId:1,surfaceToken:'fixture',issuedAt:'2026-10-18T12:00:00Z',expiresAt:'2026-10-18T12:15:00Z'}}
 renderHook(()=>useProfileBoundary(profile,refresh));await act(async()=>{await vi.advanceTimersByTimeAsync(898999)});expect(refresh).not.toHaveBeenCalled();await act(async()=>{await vi.advanceTimersByTimeAsync(1)});expect(refresh).toHaveBeenCalledTimes(1)
})
