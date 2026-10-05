import { supabase } from '~/lib/supabase'
import { getVerifiedPricingOffer } from '../pricingEligibility'

const mockRpc = supabase.rpc as jest.Mock

describe('server-verified pricing eligibility', () => {
  beforeEach(() => jest.clearAllMocks())

  it.each(['early_adopter', 'general'])('accepts the server offer %s', async (offer) => {
    mockRpc.mockResolvedValue({ data: offer, error: null })

    await expect(getVerifiedPricingOffer('user-1')).resolves.toBe(offer)
    expect(mockRpc).toHaveBeenCalledWith('get_my_lifetime_pricing_offer', {
      p_expected_user_id: 'user-1',
    })
  })

  it('returns unavailable on a failed or unexpected response', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'NETWORK' } })
    mockRpc.mockResolvedValueOnce({ data: 'friends_family', error: null })

    await expect(getVerifiedPricingOffer('user-1')).resolves.toBeNull()
    await expect(getVerifiedPricingOffer('user-1')).resolves.toBeNull()
  })
})
