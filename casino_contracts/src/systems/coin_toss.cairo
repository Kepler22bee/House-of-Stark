use starknet::ContractAddress;

#[starknet::interface]
pub trait ICoinToss<T> {
    fn initialize(
        ref self: T,
        creator_address: ContractAddress,
        token_address: ContractAddress,
    );
    fn flip(ref self: T, token_id: u64, choice: u8);
}

#[dojo::contract]
pub mod coin_toss {
    use super::ICoinToss;
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use dojo::model::ModelStorage;

    use game_components_minigame::minigame::MinigameComponent;
    use game_components_minigame::interface::IMinigameTokenData;
    use openzeppelin_introspection::src5::SRC5Component;

    use cairo_casino::models::CoinTossGame;

    // Components
    component!(path: MinigameComponent, storage: minigame, event: MinigameEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    impl MinigameImpl = MinigameComponent::MinigameImpl<ContractState>;
    impl MinigameInternalImpl = MinigameComponent::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        minigame: MinigameComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        initialized: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        MinigameEvent: MinigameComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    // IMinigameTokenData — reads game state from Dojo models
    #[abi(embed_v0)]
    impl TokenDataImpl of IMinigameTokenData<ContractState> {
        fn score(self: @ContractState, token_id: u64) -> u32 {
            let world = self.world_default();
            let game: CoinTossGame = world.read_model(token_id);
            game.score
        }

        fn game_over(self: @ContractState, token_id: u64) -> bool {
            let world = self.world_default();
            let game: CoinTossGame = world.read_model(token_id);
            game.over
        }
    }

    #[abi(embed_v0)]
    impl CoinTossImpl of ICoinToss<ContractState> {
        fn initialize(
            ref self: ContractState,
            creator_address: ContractAddress,
            token_address: ContractAddress,
        ) {
            assert!(!self.initialized.read(), "Already initialized");
            self.initialized.write(true);

            self
                .minigame
                .initializer(
                    creator_address,
                    "Coin Toss",
                    "Flip a coin, double or nothing",
                    "Cairo Casino",
                    "Cairo Casino",
                    "Casino",
                    "",
                    Option::None,     // color
                    Option::None,     // client_url
                    Option::None,     // renderer_address
                    Option::None,     // settings_address
                    Option::None,     // objectives_address
                    token_address,
                );
        }

        fn flip(ref self: ContractState, token_id: u64, choice: u8) {
            assert!(choice == 0 || choice == 1, "Choice must be 0 (heads) or 1 (tails)");

            // EGS pre-action: validates token is playable
            self.minigame.pre_action(token_id);

            // Determine result using Poseidon hash
            let caller = get_caller_address();
            let timestamp = get_block_timestamp();
            let hash = core::poseidon::poseidon_hash_span(
                [token_id.into(), caller.into(), timestamp.into()].span(),
            );
            let hash_u256: u256 = hash.into();
            let result: u8 = (hash_u256 % 2).try_into().unwrap();

            let won = choice == result;
            let score = if won { 2_u32 } else { 0_u32 };

            // Write game result to Dojo model
            let mut world = self.world_default();
            world
                .write_model(
                    @CoinTossGame { token_id, choice, result, won, over: true, score },
                );

            // EGS post-action: syncs score to token, triggers metagame callback
            self.minigame.post_action(token_id);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"cairo_casino")
        }
    }
}
