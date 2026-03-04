#[cfg(test)]
mod tests {
    use dojo_cairo_test::WorldStorageTestTrait;
    use dojo::model::{ModelStorage, ModelStorageTest};
    use dojo::world::{WorldStorageTrait, world};
    use dojo_cairo_test::{
        spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef,
    };
    use core::num::traits::Bounded;
    use starknet::ContractAddress;

    use starter::systems::actions::{actions, IActionsDispatcher, IActionsDispatcherTrait};
    use starter::models::{Position, m_Position, Direction};

    fn namespace_def() -> NamespaceDef {
        NamespaceDef {
            namespace: "starter",
            resources: [
                TestResource::Model(m_Position::TEST_CLASS_HASH),
                TestResource::Event(actions::e_Moved::TEST_CLASS_HASH),
                TestResource::Contract(actions::TEST_CLASS_HASH),
            ]
                .span(),
        }
    }

    fn contract_defs() -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"starter", @"actions")
                .with_writer_of([dojo::utils::bytearray_hash(@"starter")].span()),
        ]
            .span()
    }

    fn caller() -> ContractAddress {
        0_felt252.try_into().unwrap()
    }

    fn setup() -> (dojo::world::WorldStorage, IActionsDispatcher) {
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());
        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions = IActionsDispatcher { contract_address };
        (world, actions)
    }

    #[test]
    fn test_move_from_origin() {
        let (world, actions) = setup();
        actions.move(Direction::Right);
        let position: Position = world.read_model(caller());
        assert!(position.x == 1, "x should be 1");
        assert!(position.y == 0, "y should be 0");
    }

    #[test]
    fn test_move_left() {
        let (mut world, actions) = setup();
        world.write_model_test(@Position { player: caller(), x: 5, y: 5 });
        actions.move(Direction::Left);
        let position: Position = world.read_model(caller());
        assert!(position.x == 4, "x should be 4");
        assert!(position.y == 5, "y should be 5");
    }

    #[test]
    fn test_move_right() {
        let (mut world, actions) = setup();
        world.write_model_test(@Position { player: caller(), x: 5, y: 5 });
        actions.move(Direction::Right);
        let position: Position = world.read_model(caller());
        assert!(position.x == 6, "x should be 6");
        assert!(position.y == 5, "y should be 5");
    }

    #[test]
    fn test_move_up() {
        let (mut world, actions) = setup();
        world.write_model_test(@Position { player: caller(), x: 5, y: 5 });
        actions.move(Direction::Up);
        let position: Position = world.read_model(caller());
        assert!(position.x == 5, "x should be 5");
        assert!(position.y == 6, "y should be 6");
    }

    #[test]
    fn test_move_down() {
        let (mut world, actions) = setup();
        world.write_model_test(@Position { player: caller(), x: 5, y: 5 });
        actions.move(Direction::Down);
        let position: Position = world.read_model(caller());
        assert!(position.x == 5, "x should be 5");
        assert!(position.y == 4, "y should be 4");
    }

    #[test]
    fn test_move_saturates_at_zero() {
        let (world, actions) = setup();
        // Default position is (0, 0)
        actions.move(Direction::Left);
        let position: Position = world.read_model(caller());
        assert!(position.x == 0, "x should saturate at 0");

        actions.move(Direction::Down);
        let position: Position = world.read_model(caller());
        assert!(position.y == 0, "y should saturate at 0");
    }

    #[test]
    fn test_move_saturates_at_max() {
        let (mut world, actions) = setup();
        world
            .write_model_test(
                @Position { player: caller(), x: Bounded::<u32>::MAX, y: Bounded::<u32>::MAX },
            );
        actions.move(Direction::Right);
        let position: Position = world.read_model(caller());
        assert!(position.x == Bounded::<u32>::MAX, "x should saturate at max");

        actions.move(Direction::Up);
        let position: Position = world.read_model(caller());
        assert!(position.y == Bounded::<u32>::MAX, "y should saturate at max");
    }
}
