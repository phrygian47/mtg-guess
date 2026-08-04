-- Chain mode schema.
-- Run against Neon before importing puzzles or hitting the chain API routes.

-- Authored chains. These are a pool, independent of any date: you write them
-- whenever, then chain_puzzle_schedule decides when each one goes live.
create table if not exists chain_puzzles (
    id          bigserial primary key
  , slug        text not null unique
  , status      text not null default 'draft'
                check (status in ('draft', 'ready', 'retired'))
  , notes       text
  , created_at  timestamptz not null default now()
  , updated_at  timestamptz not null default now()
);

-- One row per word. link_oracle_id is the card formed by this token plus the
-- token at the next position, so the last row of a chain is always null.
create table if not exists chain_puzzle_steps (
    chain_puzzle_id bigint not null references chain_puzzles(id) on delete cascade
  , position        integer not null
  , token           text not null
  , link_oracle_id  uuid references cards(oracle_id)
  , primary key (chain_puzzle_id, position)
);

create table if not exists chain_puzzle_schedule (
    puzzle_date     date primary key
  , chain_puzzle_id bigint not null references chain_puzzles(id)
  , unique (chain_puzzle_id)
);

-- Chain scores are 0-5 solved rows, the same range as salt score, so the
-- completion check needs a second mode in its zero-based branch.
alter table game_completions
  drop constraint game_completions_guesses_used_check;

alter table game_completions
  add constraint game_completions_guesses_used_check check (
    case
      when mode in ('salt-score', 'chain-link') then guesses_used between 0 and 5
      else guesses_used between 1 and 100
    end
  );
