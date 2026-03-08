/// Mock VRF provider for local Katana development and testing.
/// Returns the transaction hash as the "random" value.
#[dojo::contract]
pub mod mock_vrf {
    use starknet::ContractAddress;
    use cairo_casino::vrf::Source;

    #[abi(per_item)]
    #[generate_trait]
    impl ExternalImpl of ExternalTrait {
        #[external(v0)]
        fn request_random(self: @ContractState, caller: ContractAddress, source: Source) {}

        #[external(v0)]
        fn consume_random(ref self: ContractState, source: Source) -> felt252 {
            starknet::get_tx_info().unbox().transaction_hash
        }
    }
}
