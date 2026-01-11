import { Input } from '@/components/ui/input';
import { render } from '@testing-library/react-native';
import React from 'react';

describe('Input Component', () => {
  it('renders basic input correctly', () => {
    const { toJSON } = render(
      <Input
        placeholder="Enter text"
        value=""
        onChangeText={() => {}}
      />
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders input with label correctly', () => {
    const { toJSON } = render(
      <Input
        label="Email"
        placeholder="Enter your email"
        value=""
        onChangeText={() => {}}
      />
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders input with error correctly', () => {
    const { toJSON } = render(
      <Input
        label="Email"
        placeholder="Enter your email"
        value="invalid-email"
        onChangeText={() => {}}
        error="Invalid email format"
      />
    );
    expect(toJSON()).toMatchSnapshot();
  });



  it('renders password input correctly', () => {
    const { toJSON } = render(
      <Input
        label="Password"
        placeholder="Enter password"
        value=""
        onChangeText={() => {}}
        secureTextEntry
      />
    );
    expect(toJSON()).toMatchSnapshot();
  });
});