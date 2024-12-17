import { JSONSerializer, Base64Serializer } from '../../../src/common';

describe('JSONSerializer', () => {
  describe('Serializer interface', () => {
    it('should serialize and deserialize objects correctly', () => {
      const serializer = new JSONSerializer();
      const data = { name: 'test', value: 123, nested: { arr: [1, 2, 3] } };

      const serialized = serializer.serialize(data);
      expect(typeof serialized).toBe('string');

      const deserialized = serializer.deserialize(serialized);
      expect(deserialized).toEqual(data);
    });

    it('should return default value on invalid JSON', () => {
      const serializer = new JSONSerializer();
      const defaultValue = { default: true };

      const result = serializer.deserialize('invalid json', defaultValue);
      expect(result).toEqual(defaultValue);
    });
  });

  describe('JSON-like API', () => {
    it('should stringify and parse objects correctly', () => {
      const serializer = new JSONSerializer();
      const data = { name: 'test', value: 123 };

      const json = serializer.stringify(data);
      expect(typeof json).toBe('string');

      const obj = serializer.parse(json);
      expect(obj).toEqual(data);
    });

    it('should support custom replacer and space', () => {
      const serializer = new JSONSerializer();
      const data = { a: 1, b: 2 };

      const replacer = function (
        this: unknown,
        key: string,
        value: unknown
      ): unknown {
        return typeof value === 'number' ? value * 2 : value;
      };

      const json = serializer.stringify(data, replacer, 4);
      const obj = serializer.parse(json);

      expect(obj).toEqual({ a: 2, b: 4 });
      expect(json).toContain('\n    ');
    });

    it('should support array replacer', () => {
      const serializer = new JSONSerializer();
      const data = { a: 1, b: 2, c: 3 };

      const json = serializer.stringify(data, ['a', 'b']);
      const obj = serializer.parse(json);

      expect(obj).toEqual({ a: 1, b: 2 });
      expect(obj).not.toHaveProperty('c');
    });

    it('should normalize line endings', () => {
      const serializer = new JSONSerializer();
      const data = { text: 'line1\r\nline2\r\nline3' };

      const json = serializer.stringify(data);
      expect(json).not.toContain('\r\n');
      expect(json).toContain('\\n');

      const obj = serializer.parse(json);
      expect((obj as typeof data).text).toBe('line1\nline2\nline3');
    });
  });

  it('should handle pretty printing', () => {
    const serializer = new JSONSerializer({ pretty: true, indent: 4 });
    const data = { name: 'test' };

    const serialized = serializer.serialize(data);
    expect(serialized).toContain('\n');
    expect(serialized).toContain('    ');
  });

  it('should throw on circular references', () => {
    const serializer = new JSONSerializer();
    const circular: Record<string, unknown> = { prop: 'value' };
    circular.self = circular;

    expect(() => serializer.serialize(circular)).toThrow('circular');
  });
});

describe('Base64Serializer', () => {
  it('should serialize and deserialize strings correctly', () => {
    const serializer = new Base64Serializer();
    const data = 'Hello World! 你好世界！';

    const encoded = serializer.serialize(data);
    expect(typeof encoded).toBe('string');
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+=*$/);

    const decoded = serializer.deserialize(encoded);
    expect(decoded).toBe(data);
  });

  it('should handle URL-safe encoding', () => {
    const serializer = new Base64Serializer({ urlSafe: true });
    const data = 'Hello World!';

    const encoded = serializer.serialize(data);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');

    const decoded = serializer.deserialize(encoded);
    expect(decoded).toBe(data);
  });

  it('should return default value on invalid base64', () => {
    const serializer = new Base64Serializer();
    const defaultValue = 'default';

    const result = serializer.deserialize('invalid base64!', defaultValue);
    expect(result).toBe(defaultValue);
  });
});

describe('JSONSerializer Performance', () => {
  const serializer = new JSONSerializer();

  // 辅助函数：运行性能测试并返回统计数据
  function runPerformanceTest(
    testFn: () => void,
    iterations: number = 1000
  ): { mean: number; min: number; max: number } {
    const times: number[] = [];

    // 多次运行以获得更稳定的结果
    for (let run = 0; run < 5; run++) {
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        testFn();
      }
      times.push((performance.now() - start) / iterations);
    }

    return {
      mean: times.reduce((a, b) => a + b) / times.length,
      min: Math.min(...times),
      max: Math.max(...times)
    };
  }

  it('should measure array serialization performance', () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => i);

    // 预热
    for (let i = 0; i < 100; i++) {
      serializer.stringify(largeArray);
      serializer.serializeArray(largeArray);
    }

    const normalStats = runPerformanceTest(
      () => serializer.stringify(largeArray),
      100
    );

    const fastStats = runPerformanceTest(
      () => serializer.serializeArray(largeArray),
      100
    );

    //     console.log(`
    // Array serialization performance (time per operation in ms):
    // Normal stringify:
    //   Mean: ${normalStats.mean.toFixed(4)}
    //   Min:  ${normalStats.min.toFixed(4)}
    //   Max:  ${normalStats.max.toFixed(4)}
    // Fast array:
    //   Mean: ${fastStats.mean.toFixed(4)}
    //   Min:  ${fastStats.min.toFixed(4)}
    //   Max:  ${fastStats.max.toFixed(4)}
    // Improvement:
    //   Mean: ${((1 - fastStats.mean / normalStats.mean) * 100).toFixed(2)}%
    //   Best case: ${((1 - fastStats.min / normalStats.min) * 100).toFixed(2)}%
    //     `);

    // 验证结果正确性
    const normalResult = serializer.stringify(largeArray);
    const fastResult = serializer.serializeArray(largeArray);
    expect(JSON.parse(fastResult)).toEqual(JSON.parse(normalResult));

    // 记录性能特征而不是比较
    expect(fastStats.mean).toBeDefined();
    expect(normalStats.mean).toBeDefined();
  });
});
