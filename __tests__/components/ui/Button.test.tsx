import { Button } from '@/components/ui/button';
import { render } from '@testing-library/react-native';
import React from 'react';

describe('Button Component', () => {
  it('renders primary button correctly', () => {
    const { toJSON } = render(
      <Button onPress={() => {}}>
        Primary Button
      </Button>
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders secondary button correctly', () => {
    const { toJSON } = render(
      <Button variant="secondary" onPress={() => {}}>
        Secondary Button
      </Button>
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders disabled button correctly', () => {
    const { toJSON } = render(
      <Button disabled onPress={() => {}}>
        Disabled Button
      </Button>
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders loading button correctly', () => {
    const { toJSON } = render(
      <Button loading onPress={() => {}}>
        Loading Button
      </Button>
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders button with icon correctly', () => {
    const { toJSON } = render(
      <Button icon="add" onPress={() => {}}>
        Button with Icon
      </Button>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});