use starter::models::{Direction, Position};
use core::num::traits::Bounded;

fn next_position(position: Position, direction: Direction) -> (u32, u32) {
    match direction {
        Direction::Left => {
            let x = if position.x > 0 { position.x - 1 } else { 0 };
            (x, position.y)
        },
        Direction::Right => {
            let x = if position.x < Bounded::<u32>::MAX {
                position.x + 1
            } else {
                position.x
            };
            (x, position.y)
        },
        Direction::Up => {
            let y = if position.y < Bounded::<u32>::MAX {
                position.y + 1
            } else {
                position.y
            };
            (position.x, y)
        },
        Direction::Down => {
            let y = if position.y > 0 { position.y - 1 } else { 0 };
            (position.x, y)
        },
    }
}

#[starknet::interface]
pub trait IActions<T> {
    fn move(ref self: T, direction: Direction);
}

#[dojo::contract]
pub mod actions {
    use super::{IActions, Direction, Position, next_position};
    use starknet::get_caller_address;
    use dojo::model::ModelStorage;
    use dojo::event::EventStorage;

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct Moved {
        #[key]
        pub player: starknet::ContractAddress,
        pub direction: Direction,
        pub x: u32,
        pub y: u32,
    }

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn move(ref self: ContractState, direction: Direction) {
            let mut world = self.world_default();
            let player = get_caller_address();
            let position: Position = world.read_model(player);

            let (x, y) = next_position(position, direction);
            world.write_model(@Position { player, x, y });
            world.emit_event(@Moved { player, direction, x, y });
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"starter")
        }
    }
}
