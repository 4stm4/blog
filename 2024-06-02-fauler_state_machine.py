from typing import List, Dict, Any
from typing_extensions import Self

class AbstractEvent:
    name: str
    code: str

    def __init__(self: Self, name: str, code: str):
        self.name = name
        self.code = code

    def get_code(self: Self) -> str:
        return self.code

    def get_name(self: Self) -> str:
        return self.name


class Command(AbstractEvent):
    pass


class Event(AbstractEvent):
    pass


class State:
    name: str
    actions: List[Command]
    transitions: Dict[str, Any]

    def add_transition(self: Self, event: Event, target_state):
        if target_state:
            self.transitions[event.get_code(), target_state]

class Transition:
    source: State
    target: State
    trigger: Event

    def __init_(self: Self, source: State, target: State, trigger: Event):
        self.source = source
        self.target = target
        self.trigger = trigger

    def get_source(self: Self) -> State:
        return self.source
    
    def get_target(self: Self) -> State:
        return self.target

    def get_trigger(self: Self) -> Event:
        return self.trigger

    def get_event_code(self: Self) -> str:
        return self.trigger.get_code()


class StateMachine:
    start: State

    def __init__(self: Self, start: State):
        self.start = start

    def get_states(self):
    
